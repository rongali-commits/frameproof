import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
process.loadEnvFile(".env.local");
assert.equal(process.env.FRAMEPROOF_QA_ALLOW_ACCOUNT_CREATION, "yes",
  "This script creates synthetic accounts and records. Set FRAMEPROOF_QA_ALLOW_ACCOUNT_CREATION=yes only for your named test installation.");
const url = process.env.VITE_SUPABASE_URL,
  key = process.env.VITE_SUPABASE_ANON_KEY;
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const owner = client(),
  outsider = client(),
  anonymous = client();
const runId = randomUUID().slice(0, 8),
  password = `Qa!${randomUUID()}a9`;
const results = [];
function ok(label) {
  results.push(label);
  console.log("PASS", label);
}
function check(r) {
  if (r.error) throw new Error(r.error.message);
  return r.data;
}
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK0sAAAAASUVORK5CYII=",
  "base64",
);
async function signup(c, label) {
  const r = check(
    await c.auth.signUp({
      email: `frameproof-qa-${label}-${runId}@example.com`,
      password,
      options: { data: { display_name: `QA ${label}` } },
    }),
  );
  assert(
    r.session,
    "QA requires email-confirmation-disabled test environment. No user credentials are used.",
  );
  return r.user.id;
}
async function guest(token, action = "read", version_id = null, payload = {}) {
  const r = await fetch(`${url}/functions/v1/public-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      action,
      version_id,
      name: "QA Guest",
      payload,
    }),
  });
  return { status: r.status, data: await r.json() };
}
let project;
try {
  const ownerId = await signup(owner, "owner"),
    otherId = await signup(outsider, "outsider");
  ok("Two isolated test accounts created without user credentials");
  project = check(
    await owner
      .from("projects")
      .insert({
        name: `QA ONLY ${runId}`,
        description: "Disposable integration test. No client data.",
      })
      .select()
      .single(),
  );
  assert.equal(project.owner_id, ownerId);
  ok("Project creation stamps owner on server");
  assert.equal(
    check(await outsider.from("projects").select("id").eq("id", project.id))
      .length,
    0,
  );
  ok("Unrelated user cannot read project");
  const anon = await anonymous
    .from("projects")
    .select("id")
    .eq("id", project.id);
  assert(anon.error || anon.data.length === 0);
  ok("Anonymous user cannot read workspace tables");
  assert(
    (
      await owner
        .from("projects")
        .update({ owner_id: otherId })
        .eq("id", project.id)
    ).error,
  );
  ok("Project owner cannot rewrite ownership column");
  const asset = check(
    await owner
      .from("assets")
      .insert({
        project_id: project.id,
        name: "QA Image",
        subtitle: "Test image",
      })
      .select()
      .single(),
  );
  ok("Asset creation succeeds");
  async function revision(assetId = asset.id) {
    const path = `${project.id}/${assetId}/${randomUUID()}.png`;
    check(
      await owner.storage
        .from("frameproof-assets")
        .upload(path, png, { contentType: "image/png" }),
    );
    const id = check(
      await owner.rpc("allocate_version", {
        p_asset_id: assetId,
        p_storage_path: path,
        p_width: 1,
        p_height: 1,
        p_original_name: "qa.png",
      }),
    );
    return { id, path };
  }
  const v1 = await revision();
  ok("Private upload and atomic revision registration");
  assert(
    (
      await outsider.rpc("allocate_version", {
        p_asset_id: asset.id,
        p_storage_path: v1.path,
        p_width: 1,
        p_height: 1,
        p_original_name: "qa.png",
      })
    ).error,
  );
  ok("Nullable outsider role cannot bypass allocation authorization");
  const deniedFile = await outsider.storage
    .from("frameproof-assets")
    .download(v1.path);
  assert(deniedFile.error);
  ok("Unrelated user cannot download private image");
  const thread = check(
    await owner
      .from("threads")
      .insert({
        version_id: v1.id,
        x: 0.42,
        y: 0.61,
        body: "QA pinned comment",
        author_name: "FORGED",
      })
      .select()
      .single(),
  );
  assert.equal(thread.author_name, "QA owner");
  ok("Pinned comment persists and author snapshot is server-stamped");
  check(
    await owner
      .from("replies")
      .insert({
        thread_id: thread.id,
        body: "QA reply",
        author_name: "FORGED",
      }),
  );
  check(
    await owner.from("threads").update({ resolved: true }).eq("id", thread.id),
  );
  assert.equal(
    check(
      await owner
        .from("threads")
        .select("resolved")
        .eq("id", thread.id)
        .single(),
    ).resolved,
    true,
  );
  ok("Reply and resolve persist");
  check(
    await owner
      .from("decisions")
      .insert({
        version_id: v1.id,
        status: "approved",
        note: "QA approved",
        author_name: "FORGED",
      }),
  );
  const [v2, v3] = await Promise.all([revision(), revision()]);
  const versions = check(
    await owner
      .from("asset_versions")
      .select("id,version_number")
      .eq("asset_id", asset.id)
      .order("version_number"),
  );
  assert.deepEqual(
    versions.map((v) => v.version_number),
    [1, 2, 3],
  );
  ok("Concurrent uploads receive unique sequential revisions");
  assert.equal(
    check(await owner.from("decisions").select("id").eq("version_id", v2.id))
      .length,
    0,
  );
  ok("New revision does not inherit approval");
  const remove = await owner
    .from("asset_versions")
    .delete()
    .eq("id", v1.id)
    .select("id");
  assert(remove.error || remove.data.length === 0);
  ok("Registered versions are immutable");
  check(
    await owner
      .from("project_members")
      .insert({ project_id: project.id, user_id: otherId, role: "reviewer" }),
  );
  assert.equal(
    check(await outsider.from("projects").select("id").eq("id", project.id))
      .length,
    1,
  );
  ok("Reviewer membership grants scoped read");
  assert(
    (
      await outsider
        .from("assets")
        .insert({ project_id: project.id, name: "Not allowed" })
    ).error,
  );
  assert(
    (
      await outsider.rpc("create_review_link", {
        p_asset_id: asset.id,
        p_days: 7,
      })
    ).error,
  );
  ok("Reviewer cannot upload assets or create share links");
  const link = check(
    await owner.rpc("create_review_link", { p_asset_id: asset.id, p_days: 1 }),
  );
  assert(/^[a-f0-9]{64}$/.test(link.token));
  assert(
    (await owner.rpc("create_review_link", { p_asset_id: asset.id, p_days: 0 }))
      .error,
  );
  ok("Share link expiry bounds enforced");
  const read = await guest(link.token);
  assert.equal(read.status, 200, JSON.stringify(read));
  assert.equal(read.data.asset.id, asset.id);
  assert.equal(read.data.versions.length, 3);
  assert(!("storage_path" in read.data.versions[0]));
  ok("Guest receives only shared asset and short-lived signed image URLs");
  assert.equal((await fetch(read.data.versions[0].signed_url)).status, 200);
  ok("Guest signed image loads");
  assert.equal(
    (
      await guest(link.token, "comment", v3.id, {
        x: 0.5,
        y: 0.5,
        body: "QA guest feedback",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await guest(link.token, "decision", v3.id, {
        status: "changes_requested",
        note: "QA guest revision request",
      })
    ).status,
    200,
  );
  ok("Guest comments and decisions persist on exact revision");
  const asset2 = check(
    await owner
      .from("assets")
      .insert({ project_id: project.id, name: "Other QA asset" })
      .select()
      .single(),
  );
  const otherV = await revision(asset2.id);
  assert.equal(
    (
      await guest(link.token, "comment", otherV.id, {
        x: 0,
        y: 0,
        body: "Must fail",
      })
    ).status,
    403,
  );
  ok("Guest cannot mutate another asset by changing version ID");
  assert((await anonymous.rpc("public_review", { p_token: link.token })).error);
  assert((await outsider.rpc("public_review", { p_token: link.token })).error);
  ok("Privileged guest RPC is inaccessible to anon and authenticated clients");
  check(await owner.rpc("revoke_review_link", { p_id: link.id }));
  assert.equal((await guest(link.token)).status, 403);
  ok("Revocation blocks the next guest request");
  assert.notEqual((await guest("0".repeat(64))).status, 200);
  ok("Unknown review tokens are rejected");
  check(
    await owner
      .from("project_members")
      .delete()
      .eq("project_id", project.id)
      .eq("user_id", otherId),
  );
  assert.equal(
    check(await outsider.from("projects").select("id").eq("id", project.id))
      .length,
    0,
  );
  ok("Removing membership removes project access");
  console.log(
    `VERIFIED ${results.length} backend assertions. Test project: ${project.id}. Test accounts contain no real personal data.`,
  );
} catch (e) {
  console.error("FAILED", e.message);
  process.exitCode = 1;
}

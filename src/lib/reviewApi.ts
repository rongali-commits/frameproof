import { supabase, STORAGE_BUCKET, backendUrl } from "./supabase";
import { inspectImage } from "./validation";
import type { Asset, Comment, DecisionRecord, DecisionStatus } from "@/types";

export type Role = "admin" | "designer" | "reviewer";
export interface ProjectRow {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: string;
}
export interface AssetRow {
  id: string;
  name: string;
  subtitle: string;
}
export interface VersionRow {
  id: string;
  asset_id: string;
  version_number: number;
  storage_path?: string;
  signed_url?: string;
  created_at: string;
}
export interface ThreadRow {
  id: string;
  version_id: string;
  x: number;
  y: number;
  body: string;
  author_name: string;
  resolved: boolean;
  created_at: string;
}
export interface ReplyRow {
  id: string;
  thread_id: string;
  body: string;
  author_name: string;
  created_at: string;
}
export interface DecisionRow {
  id: string;
  version_id: string;
  status: DecisionStatus;
  note: string;
  author_name: string;
  created_at: string;
}
export interface Snapshot {
  assets: Asset[];
  comments: Comment[];
  decisions: DecisionRecord[];
}
export interface ReviewLink {
  id: string;
  asset_id: string;
  expires_at: string;
  revoked_at: string | null;
}

export function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}
export function mapSnapshot(
  assets: AssetRow[],
  versions: VersionRow[],
  threads: ThreadRow[],
  replies: ReplyRow[],
  decisions: DecisionRow[],
): Snapshot {
  const assetOf = (id: string) =>
    versions.find((v) => v.id === id)?.asset_id ?? "";
  return {
    assets: assets.map((a) => ({
      ...a,
      versions: versions
        .filter((v) => v.asset_id === a.id)
        .sort((a, b) => a.version_number - b.version_number)
        .map((v) => ({
          id: v.id,
          version: `v${v.version_number}`,
          label: `v${v.version_number}`,
          src: v.signed_url ?? "",
          uploadedAt: v.created_at,
        })),
    })),
    comments: threads.map((t) => ({
      id: t.id,
      assetId: assetOf(t.version_id),
      versionId: t.version_id,
      pin: { id: t.id, x: t.x, y: t.y },
      author: t.author_name,
      body: t.body,
      resolved: t.resolved,
      createdAt: t.created_at,
      replies: replies
        .filter((r) => r.thread_id === t.id)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((r) => ({
          id: r.id,
          author: r.author_name,
          body: r.body,
          createdAt: r.created_at,
        })),
    })),
    decisions: decisions.map((d) => ({
      id: d.id,
      assetId: assetOf(d.version_id),
      versionId: d.version_id,
      status: d.status,
      reviewer: d.author_name,
      note: d.note,
      createdAt: d.created_at,
    })),
  };
}

export async function loadProject(id: string) {
  const project = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single<ProjectRow>();
  check(project.error);
  const role = await supabase.rpc("get_user_role", { p_project_id: id });
  check(role.error);
  const a = await supabase
    .from("assets")
    .select("id,name,subtitle")
    .eq("project_id", id)
    .order("created_at")
    .returns<AssetRow[]>();
  check(a.error);
  if (!a.data?.length)
    return {
      project: project.data!,
      role: role.data as Role,
      snapshot: { assets: [], comments: [], decisions: [] } as Snapshot,
    };
  const v = await supabase
    .from("asset_versions")
    .select("*")
    .in(
      "asset_id",
      a.data.map((a) => a.id),
    )
    .returns<VersionRow[]>();
  check(v.error);
  const versions = await Promise.all(
    (v.data ?? []).map(async (v) => {
      const signed = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(v.storage_path!, 900);
      check(signed.error);
      return { ...v, signed_url: signed.data!.signedUrl };
    }),
  );
  if (!versions.length)
    return {
      project: project.data!,
      role: role.data as Role,
      snapshot: mapSnapshot(a.data, [], [], [], []),
    };
  const ids = versions.map((v) => v.id);
  const [t, d] = await Promise.all([
    supabase
      .from("threads")
      .select("*")
      .in("version_id", ids)
      .returns<ThreadRow[]>(),
    supabase
      .from("decisions")
      .select("*")
      .in("version_id", ids)
      .returns<DecisionRow[]>(),
  ]);
  check(t.error);
  check(d.error);
  const r = t.data?.length
    ? await supabase
        .from("replies")
        .select("*")
        .in(
          "thread_id",
          t.data.map((t) => t.id),
        )
        .returns<ReplyRow[]>()
    : { data: [], error: null };
  check(r.error);
  return {
    project: project.data!,
    role: role.data as Role,
    snapshot: mapSnapshot(
      a.data,
      versions,
      t.data ?? [],
      r.data ?? [],
      d.data ?? [],
    ),
  };
}

export async function uploadRevision(
  projectId: string,
  assetId: string,
  file: File,
) {
  const { width, height } = await inspectImage(file);
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[
    file.type
  ];
  const path = `${projectId}/${assetId}/${crypto.randomUUID()}.${ext}`;
  const upload = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  check(upload.error);
  const allocated = await supabase.rpc("allocate_version", {
    p_asset_id: assetId,
    p_storage_path: path,
    p_width: width,
    p_height: height,
    p_original_name: file.name.slice(0, 255),
  });
  if (allocated.error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([path]);
    check(allocated.error);
  }
  return allocated.data as string;
}

export async function guestRequest(
  token: string,
  action = "read",
  version?: string,
  name?: string,
  payload?: Record<string, unknown>,
) {
  const response = await fetch(`${backendUrl}/functions/v1/public-review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action, version_id: version, name, payload }),
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error || "This review link is unavailable.");
  return body;
}
export async function loadGuest(token: string) {
  const body = (await guestRequest(token)) as {
    asset: AssetRow;
    versions: VersionRow[];
    threads: ThreadRow[];
    replies: ReplyRow[];
    decisions: DecisionRow[];
    expires_at: string;
  };
  return {
    snapshot: mapSnapshot(
      [body.asset],
      body.versions.map((v) => ({ ...v, asset_id: body.asset.id })),
      body.threads,
      body.replies,
      body.decisions,
    ),
    name: body.asset.name,
    expiry: body.expires_at,
  };
}

export function exportReview(snapshot: Snapshot, projectName: string) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          project: projectName,
          exportedAt: new Date().toISOString(),
          notice:
            "Review activity record, not an electronic signature. Guest names are self-reported.",
          assets: snapshot.assets.map((a) => ({
            ...a,
            versions: a.versions.map(({ src, ...v }) => v),
          })),
          comments: snapshot.comments,
          decisions: snapshot.decisions,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "frameproof-review-record.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

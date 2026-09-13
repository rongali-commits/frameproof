export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return {
      ok: false,
      error: "Only PNG, JPEG, or WebP files are accepted.",
    };
  }
  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    return {
      ok: false,
      error: "File is too large. Maximum 10 MB.",
    };
  }
  return { ok: true };
}

export async function inspectImage(
  file: File,
): Promise<{ width: number; height: number }> {
  const check = validateImageFile(file);
  if (!check.ok) throw new Error(check.error);
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const png =
    bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!{ "image/png": png, "image/jpeg": jpeg, "image/webp": webp }[file.type])
    throw new Error("The file contents do not match the image format.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image is damaged or cannot be decoded.");
  }
  const { width, height } = bitmap;
  bitmap.close();
  if (
    width < 1 ||
    height < 1 ||
    width > 12000 ||
    height > 12000 ||
    width * height > 40000000
  )
    throw new Error(
      "Use an image under 40 megapixels and 12,000 pixels per side.",
    );
  return { width, height };
}

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
  if (file.size > MAX_IMAGE_SIZE) {
    return {
      ok: false,
      error: "File is too large. Maximum 10 MB.",
    };
  }
  return { ok: true };
}

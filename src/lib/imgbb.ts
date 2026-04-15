/**
 * FILE: src/lib/imgbb.ts
 *
 * Image hosting — uses freeimage.host (free, unlimited, no account ban).
 * Uploads event photos and returns a permanent public URL.
 * No API key needed — uses the public API key.
 */

const FREEIMAGE_API_KEY = "6d207e02198a847aa98d0a2a901485a5";

export async function uploadToImgBB(
  buffer: Buffer,
  filename: string
): Promise<{ url: string; deleteUrl: string }> {
  const base64 = buffer.toString("base64");

  const formData = new FormData();
  formData.append("key", FREEIMAGE_API_KEY);
  formData.append("source", base64);
  formData.append("title", filename);
  formData.append("format", "json");

  const res = await fetch("https://freeimage.host/api/1/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!data.success && data.status_code !== 200) {
    throw new Error(data.error?.message ?? "Image upload failed");
  }

  return {
    url: data.image?.image?.url ?? data.image?.url ?? "",
    deleteUrl: "",
  };
}

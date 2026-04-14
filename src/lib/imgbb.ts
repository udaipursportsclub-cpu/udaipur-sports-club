/**
 * FILE: src/lib/imgbb.ts
 *
 * ImgBB image hosting — free, unlimited storage, one API key.
 * Uploads event photos and returns a permanent public URL.
 *
 * Key needed:
 *   IMGBB_API_KEY — from imgbb.com/api (free)
 */

export async function uploadToImgBB(
  buffer: Buffer,
  filename: string
): Promise<{ url: string; deleteUrl: string }> {
  const apiKey = process.env.IMGBB_API_KEY;
  if (!apiKey) throw new Error("IMGBB_API_KEY not configured");

  const base64 = buffer.toString("base64");

  const formData = new FormData();
  formData.append("key", apiKey);
  formData.append("image", base64);
  formData.append("name", filename);

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.error?.message ?? "ImgBB upload failed");
  }

  return {
    url: data.data.url,
    deleteUrl: data.data.delete_url ?? "",
  };
}

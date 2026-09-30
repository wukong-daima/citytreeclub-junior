export type PhotoStyle = "natural" | "mono" | "warm";
/** Re-encode in the browser to bound dimensions and discard original EXIF metadata. */
export async function uploadObservationPhoto(
  file: File,
  style: PhotoStyle = "natural",
) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("JPEG·PNG·WebP 사진을 골라주세요.");
  if (file.size > 15 * 1024 * 1024)
    throw Error("원본 사진은 15MB 이하로 골라주세요.");
  const bitmap = await createImageBitmap(file);
  let blob: Blob;
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("사진을 처리하지 못했어요.");
    ctx.fillStyle = "#fffdf7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.filter =
      style === "mono"
        ? "grayscale(1) contrast(1.1)"
        : style === "warm"
          ? "sepia(.22) saturate(.85)"
          : "none";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(Error("사진을 압축하지 못했어요.")),
        "image/jpeg",
        0.85,
      ),
    );
  } finally {
    bitmap.close();
  }
  if (blob.size > 3 * 1024 * 1024)
    throw Error(
      "압축한 사진이 3MB를 넘어요. 작은 사진으로 다시 시도해 주세요.",
    );
  const body = new FormData();
  body.set("photo", blob, "tree-observation.jpg");
  const response = await fetch("/api/photos", { method: "POST", body });
  const data = (await response.json()) as { photoKey: string; error?: string };
  if (!response.ok) throw Error(data.error || "사진을 업로드하지 못했어요.");
  return data.photoKey;
}

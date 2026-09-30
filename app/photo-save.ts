import { localFetch } from "../lib/local-api.ts";

/** Keep a newly uploaded photo only if its record was saved successfully. */
export async function saveWithPhoto(
  upload: () => Promise<string | undefined>,
  save: (photoKey: string | undefined) => Promise<boolean>,
  request: typeof localFetch = localFetch,
): Promise<boolean> {
  const photoKey = await upload();
  let saved = false;
  try {
    saved = await save(photoKey);
    return saved;
  } finally {
    if (photoKey && !saved) {
      const response = await request(
        `/api/photos?key=${encodeURIComponent(photoKey)}`,
        { method: "DELETE" },
      );
      // Another committed record may own this photo even if refreshing the UI failed.
      if (!response.ok && response.status !== 404 && response.status !== 409)
        throw Error(
          "기록 저장과 임시 사진 정리에 실패했어요. 저장 공간과 브라우저 권한을 확인해 주세요.",
        );
    }
  }
}

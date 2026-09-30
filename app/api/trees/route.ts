import { candidates, validLocation } from "@/lib/domain";
import { TREES } from "@/lib/trees";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat")),
    lng = Number(params.get("lng")),
    radius = Number(params.get("radius") ?? 500);
  if (
    !params.get("lat")?.trim() ||
    !params.get("lng")?.trim() ||
    !validLocation(lat, lng, radius)
  )
    return Response.json(
      { error: "올바른 위치와 반경(300·500·1000·2000m)을 선택해 주세요." },
      { status: 400 },
    );
  const trees = candidates(TREES, lat, lng, radius);
  return Response.json({ trees, candidateCount: trees.length, sample: true });
}

import { endSession } from "@/lib/clubStore";
import { respond } from "@/lib/apiHelpers";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clubId: string; sessionId: string }> },
) {
  const { clubId, sessionId } = await params;
  return respond(() => endSession(clubId, sessionId));
}

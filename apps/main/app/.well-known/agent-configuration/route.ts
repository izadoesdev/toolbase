import { auth } from "@/lib/auth";

export async function GET() {
  const configuration = await auth.api.getAgentConfiguration();
  return Response.json(configuration, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}

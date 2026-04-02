import { headers } from "next/headers";
import { isAdmin } from "@/lib/toolbase/permissions";
import { approveProduct, rejectProduct } from "@/lib/toolbase/registry";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const h = await headers();
  if (!(await isAdmin(h))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: { action?: unknown; resolutions?: unknown };
  try {
    body = (await request.json()) as {
      action?: unknown;
      resolutions?: unknown;
    };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { action, resolutions } = body as {
    action: "approve" | "reject";
    resolutions?: Record<string, "current" | "proposed">;
  };

  if (action === "approve") {
    const result = await approveProduct(id, resolutions);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 404 });
    }
    return Response.json({ ok: true, id, status: "approved" });
  }

  if (action === "reject") {
    const result = await rejectProduct(id);
    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 404 });
    }
    return Response.json({ ok: true, id, status: "rejected" });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}

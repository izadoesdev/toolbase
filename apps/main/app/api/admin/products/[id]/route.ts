import { headers } from "next/headers";
import { z } from "zod";
import { isAdmin } from "@/lib/toolbase/permissions";
import { approveProduct, rejectProduct } from "@/lib/toolbase/registry";

const bodySchema = z.object({
  action: z.enum(["approve", "reject"]),
  resolutions: z.record(z.string(), z.enum(["current", "proposed"])).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const h = await headers();
  if (!(await isAdmin(h))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request body", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { action, resolutions } = parsed.data;

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

import { headers } from "next/headers";
import { isAdmin } from "@/lib/toolbase/permissions";
import { listPendingProducts } from "@/lib/toolbase/registry";

export async function GET() {
  const h = await headers();
  if (!(await isAdmin(h))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const pending = await listPendingProducts();
  return Response.json({ pending });
}

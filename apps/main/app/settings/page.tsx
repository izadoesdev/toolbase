import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SettingsClient } from "@/components/settings/settings-client";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-10 font-display font-semibold text-2xl text-foreground tracking-tight">
        Settings
      </h1>
      <SettingsClient
        currentSessionToken={session.session.token}
        user={session.user}
      />
    </main>
  );
}

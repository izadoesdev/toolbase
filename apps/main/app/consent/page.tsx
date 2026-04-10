"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

function ConsentForm() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client_id") ?? "";
  const scope = searchParams.get("scope") ?? "";
  const [clientName, setClientName] = useState<string>("An application");
  const [pending, setPending] = useState<"accept" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      return;
    }
    // biome-ignore lint/suspicious/noExplicitAny: oauth2 plugin types
    (authClient as any).oauth2
      .publicClient({ query: { client_id: clientId } })
      .then((res: { data?: { name?: string } }) => {
        if (res.data?.name) {
          setClientName(res.data.name);
        }
      })
      .catch(() => undefined);
  }, [clientId]);

  async function handleConsent(accept: boolean) {
    setPending(accept ? "accept" : "deny");
    setError(null);
    try {
      // biome-ignore lint/suspicious/noExplicitAny: oauth2 plugin types
      await (authClient as any).oauth2.consent({
        accept,
        scope: scope || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPending(null);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col items-center gap-6 px-4 py-24">
      <div className="text-center">
        <h1 className="font-display font-semibold text-2xl text-foreground tracking-tight">
          Authorize access
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          <strong>{clientName}</strong> wants to access your Toolbase account.
        </p>
      </div>
      {scope ? (
        <div className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
            Requested permissions
          </p>
          <p className="text-sm">{scope.split(" ").join(", ")}</p>
        </div>
      ) : null}
      {error ? (
        <p className="w-full rounded-2xl bg-destructive/10 px-3 py-2 text-center text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex w-full gap-2">
        <Button
          className="flex-1"
          disabled={pending !== null}
          onClick={() => handleConsent(false)}
          variant="outline"
        >
          {pending === "deny" ? <Spinner /> : "Deny"}
        </Button>
        <Button
          className="flex-1"
          disabled={pending !== null}
          onClick={() => handleConsent(true)}
        >
          {pending === "accept" ? <Spinner /> : "Allow"}
        </Button>
      </div>
    </main>
  );
}

export default function ConsentPage() {
  return (
    <Suspense>
      <ConsentForm />
    </Suspense>
  );
}

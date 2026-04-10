"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

type SocialProvider = "google" | "github";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} viewBox="0 0 24 24">
      <title>Google</title>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <title>GitHub</title>
      <path
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.48 2 12a10 10 0 0 0 6.84 9.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.12-1.47-1.12-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.52 2.33 1.09 2.9.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.12-4.55-4.98 0-1.1.39-1.99 1.03-2.69a3.6 3.6 0 0 1 .1-2.64s.84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.4.1 2.64.64.7 1.03 1.6 1.03 2.69 0 3.87-2.34 4.72-4.57 4.97.36.31.68.92.68 1.85v2.73c0 .27.18.58.69.48A10 10 0 0 0 22 12c0-5.52-4.48-10-10-10Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("callbackURL") ?? "/";
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSocial(provider: SocialProvider) {
    setPending(provider);
    setError(null);
    try {
      const { error: signError } = await authClient.signIn.social({
        provider,
        callbackURL,
      });
      if (signError) {
        setError(signError.message ?? "Could not start sign-in.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start sign-in.");
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="mx-auto flex max-w-sm flex-col items-center gap-6 px-4 py-24">
      <div className="text-center">
        <h1 className="font-display font-semibold text-2xl text-foreground tracking-tight">
          Sign in to Toolbase
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Continue with Google or GitHub to get started.
        </p>
      </div>
      {error ? (
        <p className="w-full rounded-2xl bg-destructive/10 px-3 py-2 text-center text-sm">
          {error}
        </p>
      ) : null}
      <div className="flex w-full flex-col gap-2">
        <Button
          className="w-full justify-center gap-2"
          disabled={pending !== null}
          onClick={() => handleSocial("google")}
          variant="outline"
        >
          {pending === "google" ? (
            <Spinner />
          ) : (
            <GoogleGlyph className="size-4 shrink-0" />
          )}
          Continue with Google
        </Button>
        <Button
          className="w-full justify-center gap-2"
          disabled={pending !== null}
          onClick={() => handleSocial("github")}
          variant="outline"
        >
          {pending === "github" ? (
            <Spinner />
          ) : (
            <GitHubGlyph className="size-4 shrink-0" />
          )}
          Continue with GitHub
        </Button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

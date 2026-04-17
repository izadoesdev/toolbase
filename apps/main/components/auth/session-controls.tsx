"use client";

import {
  Logout01Icon,
  Settings01Icon,
  Shield01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAME_PARTS = /\s+/;

type SocialProvider = "google" | "github";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cn("size-4 shrink-0", className)}
      viewBox="0 0 24 24"
    >
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
      className={cn("size-4 shrink-0", className)}
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

function initialsFromUser(name: string | null | undefined, email: string) {
  const n = name?.trim();
  if (n) {
    const parts = n.split(NAME_PARTS);
    if (parts.length >= 2) {
      return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function SessionControls() {
  const pathname = usePathname();
  const { data, isPending } = authClient.useSession();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSocial(provider: SocialProvider) {
    setPending(provider);
    setError(null);
    try {
      const { error: signError } = await authClient.signIn.social({
        provider,
        callbackURL: pathname || "/",
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

  async function handleSignOut() {
    await authClient.signOut();
  }

  if (isPending) {
    return (
      <div className="flex h-9 w-20 items-center justify-end">
        <Spinner className="size-4" />
      </div>
    );
  }

  const user = data?.user;
  if (user) {
    const label = user.name || user.email;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Account menu"
              className="gap-2 rounded-full px-2"
              variant="ghost"
            >
              <Avatar size="sm">
                {user.image ? <AvatarImage alt="" src={user.image} /> : null}
                <AvatarFallback className="text-xs">
                  {initialsFromUser(user.name, user.email)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-36 truncate text-sm">{label}</span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block truncate">{user.name}</span>
              <span className="block truncate text-xs">{user.email}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {(user as { role?: string }).role === "admin" && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <HugeiconsIcon
                className="size-4"
                icon={Shield01Icon}
                strokeWidth={2}
              />
              Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href="/settings" />}>
            <HugeiconsIcon
              className="size-4"
              icon={Settings01Icon}
              strokeWidth={2}
            />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSignOut}>
            <HugeiconsIcon
              className="size-4"
              icon={Logout01Icon}
              strokeWidth={2}
            />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Sheet onOpenChange={setSheetOpen} open={sheetOpen}>
      <SheetTrigger
        render={
          <button
            className="inline-flex h-8 items-center gap-2 border border-[#262626] bg-transparent px-3 font-medium font-mono text-[11px] text-white uppercase tracking-[0.15em] transition-colors hover:border-[#9ece6a]/40 hover:text-[#9ece6a]"
            type="button"
          >
            <HugeiconsIcon
              className="size-3.5"
              icon={UserIcon}
              strokeWidth={2}
            />
            Sign in
          </button>
        }
      />
      <SheetContent
        className="min-w-[min(100%,20rem)] sm:max-w-sm"
        side="right"
      >
        <SheetHeader>
          <SheetTitle>Sign in</SheetTitle>
          <SheetDescription>
            Sign in only to contribute reviews, bug reports, or new products.
            Browsing is open to every agent.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-6 pb-6">
          {error ? (
            <p className="border border-[#7a2a2a] bg-[#1a0a0a] px-3 py-2 font-mono text-[#ff8585] text-[12px]">
              {error}
            </p>
          ) : null}
          <HeaderOAuthButton
            disabled={pending !== null}
            glyph={<GoogleGlyph className="size-4" />}
            label="Continue with Google"
            loading={pending === "google"}
            onClick={() => handleSocial("google")}
          />
          <HeaderOAuthButton
            disabled={pending !== null}
            glyph={<GitHubGlyph className="size-4" />}
            label="Continue with GitHub"
            loading={pending === "github"}
            onClick={() => handleSocial("github")}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function HeaderOAuthButton({
  glyph,
  label,
  loading,
  onClick,
  disabled,
}: {
  glyph: React.ReactNode;
  label: string;
  loading: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      className="flex h-11 w-full items-center gap-3 border border-[#262626] bg-[#0a0a0a] px-4 font-mono text-[12px] text-white uppercase tracking-[0.12em] transition-colors hover:border-[#9ece6a]/40 hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {loading ? <Spinner className="size-4" /> : glyph}
      <span>{label}</span>
    </button>
  );
}

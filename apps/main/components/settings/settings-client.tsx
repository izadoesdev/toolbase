"use client";

import {
  ComputerIcon,
  Copy01Icon,
  Delete01Icon,
  InformationCircleIcon,
  Key01Icon,
  Logout01Icon,
  PlusSignIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface ApiKey {
  createdAt: Date;
  enabled: boolean;
  expiresAt: Date | null;
  id: string;
  name: string | null;
  prefix: string | null;
  start: string | null;
}

interface UserSession {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  ipAddress?: string | null;
  token: string;
  userAgent?: string | null;
}

interface SettingsClientProps {
  currentSessionToken: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const RE_IOS = /iPhone|iPad/;
const RE_ANDROID = /Android/;
const RE_MAC = /Mac/;
const RE_WINDOWS = /Windows/;
const RE_LINUX = /Linux/;
const RE_WHITESPACE = /\s+/;

function parseUserAgent(ua: string | null | undefined): string {
  if (!ua) {
    return "Unknown device";
  }
  if (RE_IOS.test(ua)) {
    return "iOS device";
  }
  if (RE_ANDROID.test(ua)) {
    return "Android device";
  }
  if (RE_MAC.test(ua)) {
    return "macOS";
  }
  if (RE_WINDOWS.test(ua)) {
    return "Windows";
  }
  if (RE_LINUX.test(ua)) {
    return "Linux";
  }
  return "Unknown device";
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Divider() {
  return <hr className="border-border" />;
}

// ── Skeleton rows ─────────────────────────────────────────────────────────────

function KeyRowSkeleton() {
  return (
    <li className="flex animate-pulse items-center justify-between gap-4 px-4 py-3">
      <div className="space-y-2">
        <div className="h-3.5 w-28 rounded bg-muted" />
        <div className="h-3 w-52 rounded bg-muted" />
      </div>
      <div className="h-7 w-14 rounded bg-muted" />
    </li>
  );
}

function SessionRowSkeleton() {
  return (
    <li className="flex animate-pulse items-center gap-4 px-4 py-3">
      <div className="size-7 shrink-0 rounded-lg bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-24 rounded bg-muted" />
        <div className="h-3 w-40 rounded bg-muted" />
      </div>
    </li>
  );
}

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileSection({ user }: { user: SettingsClientProps["user"] }) {
  const base = user.name ?? user.email;
  const initials = base
    .split(RE_WHITESPACE)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold text-base text-foreground">Profile</h2>
        <p className="text-muted-foreground text-sm">
          Your account information.
        </p>
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 px-4 py-4">
        <Avatar size="lg">
          {user.image ? <AvatarImage alt="" src={user.image} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground text-sm">
            {user.name ?? "—"}
          </p>
          <p className="truncate text-muted-foreground text-sm">{user.email}</p>
        </div>
      </div>
    </section>
  );
}

// ── API Keys section ──────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      className="w-20 shrink-0"
      onClick={copy}
      size="sm"
      variant="outline"
    >
      <HugeiconsIcon
        className="size-3.5"
        icon={copied ? Tick01Icon : Copy01Icon}
        strokeWidth={2}
      />
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function NewKeyBanner({
  keyValue,
  onDismiss,
}: {
  keyValue: string;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="mb-2 flex items-start gap-2">
        <HugeiconsIcon
          className="mt-0.5 size-4 shrink-0 text-amber-600"
          icon={InformationCircleIcon}
          strokeWidth={2}
        />
        <p className="font-medium text-amber-800 text-sm dark:text-amber-300">
          Copy your API key now — it won&apos;t be shown again.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 dark:border-amber-800 dark:bg-black/30">
        <code className="min-w-0 flex-1 truncate font-mono text-foreground text-xs">
          {keyValue}
        </code>
        <CopyButton value={keyValue} />
      </div>
      <button
        className="mt-3 text-amber-700 text-xs underline underline-offset-2 hover:text-amber-900 dark:text-amber-400"
        onClick={onDismiss}
        type="button"
      >
        I&apos;ve saved it, dismiss
      </button>
    </div>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    authClient.apiKey
      .list()
      .then(({ data }) => setKeys((data?.apiKeys as ApiKey[]) ?? []))
      .finally(() => setLoading(false));
  }, []);

  function openCreate() {
    setShowCreate(true);
  }

  function cancelCreate() {
    setShowCreate(false);
    setKeyName("");
  }

  function handleCreate() {
    if (!keyName.trim()) {
      return;
    }
    startTransition(async () => {
      const { data } = await authClient.apiKey.create({ name: keyName.trim() });
      if (data) {
        setNewKeyValue((data as { key: string }).key);
        setKeys((prev) => [data as ApiKey, ...prev]);
        setKeyName("");
        setShowCreate(false);
      }
    });
  }

  function handleDelete(id: string) {
    setDeleteId(id);
    startTransition(async () => {
      await authClient.apiKey.delete({ keyId: id });
      setKeys((prev) => prev.filter((k) => k.id !== id));
      setDeleteId(null);
    });
  }

  return (
    <section className="space-y-4">
      {/* Header — button stays mounted to prevent header height shift */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-base text-foreground">API Keys</h2>
          <p className="text-muted-foreground text-sm">
            Use an API key to authenticate MCP requests. Pass it as the{" "}
            <code className="rounded bg-muted px-1 font-mono text-xs">
              x-api-key
            </code>{" "}
            header.
          </p>
        </div>
        {/* Single button that changes label — no DOM removal, no height shift */}
        <Button
          className="shrink-0"
          onClick={showCreate ? cancelCreate : openCreate}
          size="sm"
          variant={showCreate ? "ghost" : "outline"}
        >
          {showCreate ? (
            "Cancel"
          ) : (
            <>
              <HugeiconsIcon
                className="size-3.5"
                icon={PlusSignIcon}
                strokeWidth={2}
              />
              New key
            </>
          )}
        </Button>
      </div>

      {/* New key revealed — shown once, always slides in from top */}
      {newKeyValue && (
        <NewKeyBanner
          keyValue={newKeyValue}
          onDismiss={() => setNewKeyValue(null)}
        />
      )}

      {/* Create form — max-h transition avoids height jump */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-in-out",
          showCreate ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex items-end gap-2 rounded-xl border border-border bg-muted/30 px-4 py-4">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs" htmlFor="key-name">
              Key name
            </Label>
            <Input
              autoFocus={showCreate}
              id="key-name"
              onChange={(e) => setKeyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="e.g. claude-desktop, cursor-agent"
              value={keyName}
            />
          </div>
          <Button
            disabled={isPending || !keyName.trim()}
            onClick={handleCreate}
            size="sm"
          >
            {isPending ? <Spinner className="size-3.5" /> : null}
            Create
          </Button>
        </div>
      </div>

      {/* Key list — skeleton matches real row height so no jump on load */}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {loading && (
          <>
            <KeyRowSkeleton />
            <KeyRowSkeleton />
          </>
        )}
        {!loading && keys.length === 0 && (
          <li className="flex flex-col items-center gap-2 py-8 text-center">
            <HugeiconsIcon
              className="size-5 text-muted-foreground"
              icon={Key01Icon}
              strokeWidth={1.5}
            />
            <p className="text-muted-foreground text-sm">No API keys yet.</p>
          </li>
        )}
        {!loading &&
          keys.length > 0 &&
          keys.map((k) => (
            <li
              className={cn(
                "flex items-center justify-between gap-4 px-4 py-3 transition-opacity",
                deleteId === k.id && "opacity-40"
              )}
              key={k.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground text-sm">
                  {k.name ?? "Unnamed key"}
                </p>
                <p className="font-mono text-muted-foreground text-xs">
                  {k.prefix ?? ""}
                  {k.start ?? ""}••••
                  {k.expiresAt
                    ? ` · Expires ${fmtDate(k.expiresAt)}`
                    : " · No expiry"}
                  {" · "}
                  Created {fmtDate(k.createdAt)}
                </p>
              </div>
              <Button
                className="w-16 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={deleteId === k.id}
                onClick={() => handleDelete(k.id)}
                size="sm"
                variant="ghost"
              >
                {deleteId === k.id ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <HugeiconsIcon
                    className="size-3.5"
                    icon={Delete01Icon}
                    strokeWidth={2}
                  />
                )}
                Revoke
              </Button>
            </li>
          ))}
      </ul>
    </section>
  );
}

// ── Sessions section ──────────────────────────────────────────────────────────

function SessionsSection({
  currentSessionToken,
}: {
  currentSessionToken: string;
}) {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeAllPending, startRevokeAll] = useTransition();

  useEffect(() => {
    authClient
      .listSessions()
      .then(({ data }) => setSessions((data as UserSession[] | null) ?? []))
      .finally(() => setLoading(false));
  }, []);

  function handleRevoke(token: string, id: string) {
    setRevokeId(id);
    startRevokeAll(async () => {
      await authClient.revokeSession({ token });
      setSessions((prev) => prev.filter((s) => s.token !== token));
      setRevokeId(null);
    });
  }

  function handleRevokeOthers() {
    startRevokeAll(async () => {
      await authClient.revokeOtherSessions();
      setSessions((prev) =>
        prev.filter((s) => s.token === currentSessionToken)
      );
    });
  }

  const otherCount = sessions.filter(
    (s) => s.token !== currentSessionToken
  ).length;
  // Show "Revoke others" only when there are multiple other sessions; keep
  // the button in the DOM but invisible so the header height never shifts.
  const showRevokeAll = !loading && otherCount > 1;

  return (
    <section className="space-y-4">
      {/* Header — "Revoke others" is always reserved in the layout */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-base text-foreground">
            Active Sessions
          </h2>
          <p className="text-muted-foreground text-sm">
            Devices currently signed in to your account.
          </p>
        </div>
        <Button
          className={cn(
            "shrink-0 text-destructive transition-opacity hover:bg-destructive/10 hover:text-destructive",
            !showRevokeAll && "pointer-events-none opacity-0"
          )}
          disabled={revokeAllPending || !showRevokeAll}
          onClick={handleRevokeOthers}
          size="sm"
          variant="outline"
        >
          {revokeAllPending ? <Spinner className="size-3.5" /> : null}
          Revoke others
        </Button>
      </div>

      {/* Session list — skeleton preserves layout height during load */}
      <ul className="divide-y divide-border rounded-xl border border-border">
        {loading ? (
          <>
            <SessionRowSkeleton />
            <SessionRowSkeleton />
          </>
        ) : (
          sessions.map((s) => {
            const isCurrent = s.token === currentSessionToken;
            const isRevoking = revokeId === s.id;
            return (
              <li
                className={cn(
                  "flex items-center justify-between gap-4 px-4 py-3 transition-opacity",
                  isRevoking && "opacity-40"
                )}
                key={s.id}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <HugeiconsIcon
                      className="size-3.5 text-muted-foreground"
                      icon={ComputerIcon}
                      strokeWidth={2}
                    />
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground text-sm">
                        {parseUserAgent(s.userAgent)}
                      </p>
                      {isCurrent && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-primary text-xs">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {s.ipAddress ?? "Unknown IP"} · Signed in{" "}
                      {fmtDate(s.createdAt)}
                    </p>
                  </div>
                </div>
                {/* Reserve fixed width so rows stay the same width whether or
                    not the button is visible — prevents text truncation shift */}
                <div className="w-16 shrink-0">
                  {!isCurrent && (
                    <Button
                      className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={isRevoking}
                      onClick={() => handleRevoke(s.token, s.id)}
                      size="sm"
                      variant="ghost"
                    >
                      {isRevoking ? (
                        <Spinner className="size-3.5" />
                      ) : (
                        <HugeiconsIcon
                          className="size-3.5"
                          icon={Logout01Icon}
                          strokeWidth={2}
                        />
                      )}
                      Revoke
                    </Button>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function SettingsClient({
  user,
  currentSessionToken,
}: SettingsClientProps) {
  return (
    <div className="space-y-10">
      <ProfileSection user={user} />
      <Divider />
      <ApiKeysSection />
      <Divider />
      <SessionsSection currentSessionToken={currentSessionToken} />
    </div>
  );
}

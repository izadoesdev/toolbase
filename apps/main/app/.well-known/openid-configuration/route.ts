import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { auth } from "@/lib/auth";

// biome-ignore lint/suspicious/noExplicitAny: cross-package type mismatch
export const GET = oauthProviderOpenIdConfigMetadata(auth as any);

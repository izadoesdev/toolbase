import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { createAuthClient } from "better-auth/client";
import { auth } from "./auth";

export const serverClient = createAuthClient({
  // biome-ignore lint/suspicious/noExplicitAny: cross-package type mismatch
  plugins: [oauthProviderResourceClient(auth as any)],
});

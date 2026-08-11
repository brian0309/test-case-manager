import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { DRIVE_SCOPES } from "../types/drive.types.js";

/** Maximum lifetime for an access token before a refresh is forced. */
const ACCESS_TOKEN_BUFFER_SECONDS = 60;

export interface DriveTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DriveOAuthProfile {
  googleId: string;
  email: string;
}

const createDriveClient = (redirectUri?: string): OAuth2Client => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing required Google OAuth environment variables (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)"
    );
  }

  return new OAuth2Client({
    clientId,
    clientSecret,
    ...(redirectUri ? { redirectUri } : {}),
  });
};

/** Absolute redirect URI used by the Drive OAuth flow. */
export const getDriveRedirectUri = (): string => {
  const uri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  if (!uri) {
    throw new Error("GOOGLE_DRIVE_REDIRECT_URI environment variable is required");
  }
  return uri;
};

export interface DriveAuthUrlResult {
  url: string;
  state: string;
}

export const getDriveAuthUrl = (): DriveAuthUrlResult => {
  const state = crypto.randomBytes(32).toString("hex");

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: getDriveRedirectUri(),
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    state,
    scope: DRIVE_SCOPES,
  };

  return { url: `${rootUrl}?${new URLSearchParams(options).toString()}`, state };
};

/**
 * Exchanges the authorization code for tokens and resolves the user's Google profile.
 */
export const exchangeDriveCode = async (code: string): Promise<DriveTokenPair & DriveOAuthProfile> => {
  const client = createDriveClient(getDriveRedirectUri());
  const { tokens } = await client.getToken({ code, redirect_uri: getDriveRedirectUri() });

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Ensure the consent screen is configured for this app."
    );
  }

  // Resolve the account email through the userinfo API using the access token.
  const profile = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profile.ok) {
    throw new Error("Failed to resolve Google profile after authorization");
  }

  const profileData = (await profile.json()) as { id: string; email: string };

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expiry_date ? Math.max(0, tokens.expiry_date - Date.now() - ACCESS_TOKEN_BUFFER_SECONDS * 1000) : 3600,
    googleId: profileData.id,
    email: profileData.email,
  };
};

/**
 * In-memory cache of short-lived access tokens keyed by user id.
 * Never persisted; refreshed server-side only.
 */
const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * Returns a valid access token for the user, refreshing from the encrypted
 * refresh token when needed or missing from the cache.
 */
export const getDriveAccessToken = async (
  userId: string,
  decryptRefreshToken: (encrypted: string) => string,
  getEncryptedRefreshToken: () => Promise<string | null>
): Promise<string> => {
  const cached = accessTokenCache.get(userId);
  if (cached && cached.expiresAt > Date.now() + ACCESS_TOKEN_BUFFER_SECONDS * 1000) {
    return cached.token;
  }

  const encrypted = await getEncryptedRefreshToken();
  if (!encrypted) {
    throw new Error("Google Drive is not connected");
  }

  const refToken = decryptRefreshToken(encrypted);
  const client = createDriveClient();
  client.setCredentials({ refresh_token: refToken });

  const { token } = await client.getAccessToken();

  if (!token) {
    throw new Error("Failed to obtain a Google Drive access token");
  }

  accessTokenCache.set(userId, {
    token,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });

  return token;
};

/** Revokes the stored offline token so the connection can be removed. */
export const revokeDriveToken = async (refreshToken: string): Promise<void> => {
  const client = createDriveClient();

  try {
    await client.revokeToken(refreshToken);
  } catch {
    // Best-effort cleanup; the user can still be disconnected locally.
  }
};
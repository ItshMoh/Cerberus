import { randomBytes, createCipheriv, createDecipheriv, createHash } from "crypto";
import { AccountBalanceQuery, type Client } from "@hashgraph/sdk";
import { createHederaClient, getHederaNetwork } from "@/lib/hedera-client";

export interface UserSessionInfo {
  token: string;
  accountId: string;
  network: "testnet" | "mainnet";
  createdAt: string;
  expiresAt: string;
}

type StoredSession = UserSessionInfo & {
  encryptedPrivateKey: string;
};

const sessions = new Map<string, StoredSession>();
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function getKeyMaterial(): Buffer {
  const seed =
    process.env.SESSION_ENCRYPTION_KEY ||
    process.env.HEDERA_OPERATOR_KEY ||
    "bonzo-guardian-session-fallback";
  return createHash("sha256").update(seed).digest();
}

function encryptPrivateKey(privateKey: string): string {
  const iv = randomBytes(12);
  const key = getKeyMaterial();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

function decryptPrivateKey(payload: string): string {
  const [ivHex, tagHex, encryptedHex] = payload.split(":");
  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error("Invalid encrypted session payload");
  }

  const key = getKeyMaterial();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function nowIso(): string {
  return new Date().toISOString();
}

function purgeExpiredSessions(): void {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (new Date(session.expiresAt).getTime() <= now) {
      sessions.delete(token);
    }
  }
}

export async function createUserSession(
  accountId: string,
  privateKey: string
): Promise<UserSessionInfo> {
  purgeExpiredSessions();

  const network = getHederaNetwork();
  const client = createHederaClient({
    accountId,
    privateKey,
    network,
  });

  // Validation: query Hedera with provided credentials
  await new AccountBalanceQuery().setAccountId(accountId).execute(client);

  const token = randomBytes(24).toString("hex");
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const encryptedPrivateKey = encryptPrivateKey(privateKey);

  const session: StoredSession = {
    token,
    accountId,
    network,
    createdAt,
    expiresAt,
    encryptedPrivateKey,
  };

  sessions.set(token, session);
  return {
    token,
    accountId,
    network,
    createdAt,
    expiresAt,
  };
}

export function getSessionInfo(token: string): UserSessionInfo | null {
  purgeExpiredSessions();
  const session = sessions.get(token);
  if (!session) return null;
  return {
    token: session.token,
    accountId: session.accountId,
    network: session.network,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
  };
}

export function destroyUserSession(token: string): boolean {
  return sessions.delete(token);
}

export function getClientForSession(token: string): Client {
  purgeExpiredSessions();
  const session = sessions.get(token);
  if (!session) {
    throw new Error("Session not found or expired");
  }
  const privateKey = decryptPrivateKey(session.encryptedPrivateKey);
  return createHederaClient({
    accountId: session.accountId,
    privateKey,
    network: session.network,
  });
}

export function resolveSessionTokenFromRequest(request: Request): string | null {
  const headerToken = request.headers.get("x-session-token");
  if (headerToken) return headerToken;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const pair = cookieHeader
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("bonzo_session="));
    if (pair) {
      return decodeURIComponent(pair.split("=")[1] || "");
    }
  }
  return null;
}

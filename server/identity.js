import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS_TIMEOUT_MS = 5_000;
const MAX_BEARER_TOKEN_LENGTH = 16_384;
const MAX_USER_ID_LENGTH = 256;
const MAX_TOKEN_AGE = '16m';
const BEARER_TOKEN_PATTERN = /^Bearer ([A-Za-z0-9_.-]+)$/;

function isVerifiedAccount(payload) {
  return typeof payload.sub === 'string' && Boolean(payload.sub.trim()) && payload.sub.length <= MAX_USER_ID_LENGTH
    && payload.emailVerified === true && payload.banned !== true && payload.role !== 'anonymous';
}

export function createIdentityVerifier(authUrl, keys, { includeEmail = false } = {}) {
  const url = new URL(authUrl);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid auth configuration");
  const verificationKeys = keys || createRemoteJWKSet(new URL(`${url.href.replace(/\/$/, "")}/.well-known/jwks.json`), { timeoutDuration: JWKS_TIMEOUT_MS });
  return async authorization => {
    const tokenMatch = typeof authorization === "string" && BEARER_TOKEN_PATTERN.exec(authorization);
    if (!tokenMatch || tokenMatch[1].length > MAX_BEARER_TOKEN_LENGTH) throw new Error("Unauthorized");
    const { payload } = await jwtVerify(tokenMatch[1], verificationKeys, {
      issuer: url.origin, audience: url.origin, algorithms: ["EdDSA"],
      requiredClaims: ["sub", "exp", "iat"], maxTokenAge: MAX_TOKEN_AGE,
    });
    if (!isVerifiedAccount(payload)) throw new Error("Unauthorized");
    return includeEmail ? { userId: payload.sub, email: typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '' } : payload.sub;
  };
}

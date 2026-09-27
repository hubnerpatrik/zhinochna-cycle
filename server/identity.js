import { createRemoteJWKSet, jwtVerify } from "jose";

export function createIdentityVerifier(authUrl, keys) {
  const url = new URL(authUrl);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid auth configuration");
  const jwks = keys || createRemoteJWKSet(new URL(`${url.href.replace(/\/$/, "")}/.well-known/jwks.json`), { timeoutDuration: 5000 });
  return async authorization => {
    const match = typeof authorization === "string" && /^Bearer ([A-Za-z0-9_.-]+)$/.exec(authorization);
    if (!match || match[1].length > 16384) throw new Error("Unauthorized");
    const { payload } = await jwtVerify(match[1], jwks, {
      issuer: url.origin, audience: url.origin, algorithms: ["EdDSA"],
      requiredClaims: ["sub", "exp", "iat"], maxTokenAge: "16m",
    });
    if (typeof payload.sub !== "string" || !payload.sub.trim() || payload.sub.length > 256
      || payload.emailVerified !== true || payload.banned === true || payload.role === "anonymous") throw new Error("Unauthorized");
    return payload.sub;
  };
}

/**
 * JWT token utilities for client-side expiry detection.
 * NOTE: These functions do NOT verify the token signature — that is always done server-side.
 */

/** Decode the base64url payload of a JWT without signature verification. */
export function decodeJwtPayload(token) {
 try {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(base64));
 } catch {
  return null;
 }
}

/** Returns true when the token is absent, malformed, or past its expiry. */
export function isTokenExpired(token) {
 if (!token) return true;
 const payload = decodeJwtPayload(token);
 if (!payload?.exp) return true;
 // Add a 10-second buffer to account for clock skew
 return Date.now() >= (payload.exp - 10) * 1000;
}

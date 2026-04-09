/**
 * JWT token utilities for client-side expiry detection.
 * NOTE: These functions do NOT verify the token signature.
 * Signature verification is always performed server-side.
 */

/**
 * Decode the base64url-encoded payload of a JWT without signature verification.
 * @param {string} token - The JWT string.
 * @returns {object|null} Decoded payload or null if the token is malformed.
 */
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

/**
 * Check whether a JWT access token is expired or missing.
 * @param {string|null} token - The access token to inspect.
 * @returns {boolean} True when the token is absent, malformed, or past its expiry.
 */
export function isTokenExpired(token) {
 if (!token) return true;
 const payload = decodeJwtPayload(token);
 if (!payload?.exp) return true;
 // Add a 10-second buffer to account for clock skew
 return Date.now() >= (payload.exp - 10) * 1000;
}

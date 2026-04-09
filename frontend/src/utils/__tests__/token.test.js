/**
 * Unit tests for JWT token utilities.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { decodeJwtPayload, isTokenExpired } from "../../utils/token";

// A real HS256 JWT with payload { sub: "user-123", exp: 9999999999 }
// (expiry year ~2286 — effectively never expires in tests)
const VALID_TOKEN =
 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
 "eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6OTk5OTk5OTk5OX0." +
 "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// A JWT whose exp is 1 (Jan 1 1970 — always expired)
const EXPIRED_TOKEN =
 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
 "eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MX0." +
 "signature";

describe("decodeJwtPayload", () => {
 it("returns the payload object for a well-formed JWT", () => {
  const payload = decodeJwtPayload(VALID_TOKEN);
  expect(payload).not.toBeNull();
  expect(payload.sub).toBe("user-123");
  expect(payload.exp).toBe(9999999999);
 });

 it("returns null for a string that is not a JWT", () => {
  expect(decodeJwtPayload("not-a-jwt")).toBeNull();
 });

 it("returns null for an empty string", () => {
  expect(decodeJwtPayload("")).toBeNull();
 });

 it("returns null for a two-part token (missing signature segment)", () => {
  expect(decodeJwtPayload("header.payload")).toBeNull();
 });

 it("returns null when the payload is invalid base64", () => {
  expect(decodeJwtPayload("header.!!!.sig")).toBeNull();
 });
});

describe("isTokenExpired", () => {
 it("returns false for a token with a far-future expiry", () => {
  expect(isTokenExpired(VALID_TOKEN)).toBe(false);
 });

 it("returns true for a token with an expired timestamp", () => {
  expect(isTokenExpired(EXPIRED_TOKEN)).toBe(true);
 });

 it("returns true for null", () => {
  expect(isTokenExpired(null)).toBe(true);
 });

 it("returns true for undefined", () => {
  expect(isTokenExpired(undefined)).toBe(true);
 });

 it("returns true for an empty string", () => {
  expect(isTokenExpired("")).toBe(true);
 });

 it("returns true for a malformed JWT", () => {
  expect(isTokenExpired("bad.token.here")).toBe(true);
 });

 it("accounts for the 10-second clock-skew buffer", () => {
  // Build a token that expires in 5 seconds — within the 10-second buffer
  const nearExpiry = Math.floor(Date.now() / 1000) + 5;
  const payload = btoa(JSON.stringify({ sub: "u", exp: nearExpiry }))
   .replace(/\+/g, "-")
   .replace(/\//g, "_")
   .replace(/=+$/, "");
  const token = `header.${payload}.sig`;
  expect(isTokenExpired(token)).toBe(true);
 });
});

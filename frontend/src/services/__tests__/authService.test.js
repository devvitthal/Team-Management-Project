/**
 * API integration tests for authService — mocks axios clients.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the api module so no real HTTP calls are made
vi.mock("../api", () => ({
 authClient: {
  post: vi.fn(),
  get: vi.fn(),
 },
}));

import { authClient } from "../api";
import { register, login, getMe, getUsers } from "../authService";

beforeEach(() => {
 vi.clearAllMocks();
});

describe("authService.register", () => {
 it("calls POST /auth/register with the supplied payload", async () => {
  const payload = {
   email: "alice@company.com",
   full_name: "Alice",
   password: "Password1",
  };
  const mockResponse = {
   access_token: "tok123",
   user: { id: "1", email: "alice@company.com", role: "team_member" },
  };
  authClient.post.mockResolvedValueOnce({ data: mockResponse });

  const result = await register(payload);

  expect(authClient.post).toHaveBeenCalledOnce();
  expect(authClient.post).toHaveBeenCalledWith("/auth/register", payload);
  expect(result).toEqual(mockResponse);
 });

 it("propagates errors thrown by the axios client", async () => {
  authClient.post.mockRejectedValueOnce(new Error("Network Error"));
  await expect(register({})).rejects.toThrow("Network Error");
 });
});

describe("authService.login", () => {
 it("calls POST /auth/login with email and password", async () => {
  const mockResponse = { access_token: "tok456", user: { role: "admin" } };
  authClient.post.mockResolvedValueOnce({ data: mockResponse });

  const result = await login("alice@company.com", "Password1");

  expect(authClient.post).toHaveBeenCalledWith("/auth/login", {
   email: "alice@company.com",
   password: "Password1",
  });
  expect(result.access_token).toBe("tok456");
 });

 it("propagates a 401 error from the server", async () => {
  const error = {
   response: { status: 401, data: { detail: "Invalid credentials" } },
  };
  authClient.post.mockRejectedValueOnce(error);
  await expect(login("bad@company.com", "wrong")).rejects.toEqual(error);
 });
});

describe("authService.getMe", () => {
 it("calls GET /auth/me and returns the user object", async () => {
  const mockUser = { id: "1", email: "alice@company.com", role: "team_member" };
  authClient.get.mockResolvedValueOnce({ data: mockUser });

  const result = await getMe();

  expect(authClient.get).toHaveBeenCalledWith("/auth/me");
  expect(result).toEqual(mockUser);
 });
});

describe("authService.getUsers", () => {
 it("calls GET /auth/users and returns the list", async () => {
  const mockUsers = [{ id: "1" }, { id: "2" }];
  authClient.get.mockResolvedValueOnce({ data: mockUsers });

  const result = await getUsers();

  expect(authClient.get).toHaveBeenCalledWith("/auth/users");
  expect(result).toHaveLength(2);
 });
});

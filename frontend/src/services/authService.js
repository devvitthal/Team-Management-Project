/** Auth service API calls. */
import { authClient } from "./api";

/**
 * Register a new user account.
 * @param {{ email: string, full_name: string, password: string }} data
 * @returns {Promise<{access_token: string, user: object}>}
 */
export const register = (data) =>
 authClient.post("/auth/register", data).then((r) => r.data);

/**
 * Authenticate a user and return a JWT access token.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{access_token: string, user: object}>}
 */
export const login = (email, password) =>
 authClient.post("/auth/login", { email, password }).then((r) => r.data);

/**
 * Return the currently authenticated user's profile.
 * @returns {Promise<object>}
 */
export const getMe = () => authClient.get("/auth/me").then((r) => r.data);

/**
 * Return all registered users (admin only).
 * @returns {Promise<object[]>}
 */
export const getUsers = () => authClient.get("/auth/users").then((r) => r.data);

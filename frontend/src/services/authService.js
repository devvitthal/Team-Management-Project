/** Auth service API calls. */
import { authClient } from "./api";

export const register = (data) =>
 authClient.post("/auth/register", data).then((r) => r.data);

export const login = (email, password) =>
 authClient.post("/auth/login", { email, password }).then((r) => r.data);

export const getMe = () => authClient.get("/auth/me").then((r) => r.data);

export const getUsers = () => authClient.get("/auth/users").then((r) => r.data);

/**
 * Component tests for ProtectedRoute.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock AuthContext so tests control the user state
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";
import ProtectedRoute from "../ProtectedRoute";

/**
 * Render ProtectedRoute within a minimal router setup.
 * @param {object|null} user - The mocked auth user (null = unauthenticated).
 * @param {string[]} allowedRoles - Roles permitted to access the route.
 */
function renderProtectedRoute(user, allowedRoles = []) {
  useAuth.mockReturnValue({ user });
  return render(
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/dashboard" element={<div>Dashboard Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("renders children when user is authenticated and no role restriction is set", () => {
    renderProtectedRoute({ id: "1", role: "team_member" });
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /login when user is null (unauthenticated)", () => {
    renderProtectedRoute(null);
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when user role is in allowedRoles", () => {
    renderProtectedRoute({ id: "1", role: "admin" }, ["admin", "org_leader"]);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects to /dashboard when user role is NOT in allowedRoles", () => {
    renderProtectedRoute({ id: "1", role: "team_member" }, ["admin", "org_leader"]);
    expect(screen.getByText("Dashboard Page")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when allowedRoles is an empty array (no restriction)", () => {
    renderProtectedRoute({ id: "1", role: "team_member" }, []);
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});

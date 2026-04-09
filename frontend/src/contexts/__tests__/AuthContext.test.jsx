/**
 * Component tests for AuthContext / AuthProvider.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock auth service
vi.mock("../../services/authService", () => ({
  login: vi.fn(),
  register: vi.fn(),
}));

// Mock token utility
vi.mock("../../utils/token", () => ({
  isTokenExpired: vi.fn(),
}));

import { login as apiLogin, register as apiRegister } from "../../services/authService";
import { isTokenExpired } from "../../utils/token";
import { AuthProvider, useAuth } from "../AuthContext";

/** Helper: renders children inside AuthProvider and exposes the context */
function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.email : "no-user"}</span>
      <button onClick={() => auth.login("a@company.com", "Password1")}>login</button>
      <button onClick={() => auth.register({ email: "a@company.com" })}>register</button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // By default tokens are not expired
  isTokenExpired.mockReturnValue(false);
});

afterEach(() => {
  localStorage.clear();
});

describe("AuthProvider initial state", () => {
  it("shows no-user when localStorage is empty", () => {
    renderWithProvider();
    expect(screen.getByTestId("user").textContent).toBe("no-user");
  });

  it("restores user from localStorage on mount", () => {
    const storedUser = { id: "1", email: "alice@company.com", role: "admin" };
    localStorage.setItem("user", JSON.stringify(storedUser));
    localStorage.setItem("access_token", "valid.token.here");
    renderWithProvider();
    expect(screen.getByTestId("user").textContent).toBe("alice@company.com");
  });

  it("clears state when stored token is already expired on mount", async () => {
    isTokenExpired.mockReturnValue(true);
    localStorage.setItem("user", JSON.stringify({ email: "alice@company.com" }));
    localStorage.setItem("access_token", "expired.token.here");
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("no-user");
    });
    expect(localStorage.getItem("access_token")).toBeNull();
  });
});

describe("AuthProvider login", () => {
  it("stores token and user in localStorage on successful login", async () => {
    const userData = { id: "1", email: "alice@company.com", role: "team_member" };
    apiLogin.mockResolvedValueOnce({ access_token: "tok123", user: userData });

    renderWithProvider();
    await userEvent.click(screen.getByText("login"));

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("alice@company.com");
    });
    expect(localStorage.getItem("access_token")).toBe("tok123");
    expect(JSON.parse(localStorage.getItem("user"))).toEqual(userData);
  });

  it("propagates rejection from the API and does not update localStorage", async () => {
    apiLogin.mockRejectedValueOnce(new Error("Invalid credentials"));
    let capturedAuth;
    function Capturer() {
      capturedAuth = useAuth();
      return null;
    }
    render(
      <AuthProvider>
        <Capturer />
      </AuthProvider>,
    );
    await expect(
      capturedAuth.login("a@company.com", "Password1"),
    ).rejects.toThrow("Invalid credentials");
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});

describe("AuthProvider register", () => {
  it("stores token and user after registration", async () => {
    const userData = { id: "2", email: "bob@company.com", role: "team_member" };
    apiRegister.mockResolvedValueOnce({ access_token: "tok789", user: userData });

    renderWithProvider();
    await userEvent.click(screen.getByText("register"));

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("bob@company.com");
    });
    expect(localStorage.getItem("access_token")).toBe("tok789");
  });
});

describe("AuthProvider logout", () => {
  it("clears user and localStorage on logout", async () => {
    const userData = { id: "1", email: "alice@company.com", role: "admin" };
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("access_token", "tok123");

    renderWithProvider();
    await userEvent.click(screen.getByText("logout"));

    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("no-user");
    });
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("user")).toBeNull();
  });
});

describe("useAuth error boundary", () => {
  it("throws an error when used outside AuthProvider", () => {
    // Suppress the error boundary console output in test logs
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow("useAuth must be used within an AuthProvider");
    consoleSpy.mockRestore();
  });
});

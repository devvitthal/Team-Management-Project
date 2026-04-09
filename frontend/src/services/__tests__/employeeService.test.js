/**
 * API integration tests for employeeService — mocks axios client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api", () => ({
 employeeClient: {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
 },
}));

import { employeeClient } from "../api";
import {
 getEmployees,
 getEmployee,
 createEmployee,
 updateEmployee,
 deleteEmployee,
} from "../employeeService";

beforeEach(() => {
 vi.clearAllMocks();
});

const MOCK_EMPLOYEE = {
 id: "emp-1",
 full_name: "Jane Doe",
 email: "jane@company.com",
};

describe("getEmployees", () => {
 it("calls GET /employees with no params by default", async () => {
  employeeClient.get.mockResolvedValueOnce({ data: [MOCK_EMPLOYEE] });
  const result = await getEmployees();
  expect(employeeClient.get).toHaveBeenCalledWith("/employees", { params: {} });
  expect(result).toHaveLength(1);
 });

 it("passes search and role params", async () => {
  employeeClient.get.mockResolvedValueOnce({ data: [] });
  await getEmployees({ search: "jane", role: "manager" });
  expect(employeeClient.get).toHaveBeenCalledWith("/employees", {
   params: { search: "jane", role: "manager" },
  });
 });
});

describe("getEmployee", () => {
 it("calls GET /employees/:id", async () => {
  employeeClient.get.mockResolvedValueOnce({ data: MOCK_EMPLOYEE });
  const result = await getEmployee("emp-1");
  expect(employeeClient.get).toHaveBeenCalledWith("/employees/emp-1");
  expect(result.id).toBe("emp-1");
 });
});

describe("createEmployee", () => {
 it("calls POST /employees with the payload", async () => {
  employeeClient.post.mockResolvedValueOnce({ data: MOCK_EMPLOYEE });
  const result = await createEmployee({
   full_name: "Jane Doe",
   email: "jane@company.com",
  });
  expect(employeeClient.post).toHaveBeenCalledWith("/employees", {
   full_name: "Jane Doe",
   email: "jane@company.com",
  });
  expect(result.full_name).toBe("Jane Doe");
 });
});

describe("updateEmployee", () => {
 it("calls PUT /employees/:id", async () => {
  employeeClient.put.mockResolvedValueOnce({
   data: { ...MOCK_EMPLOYEE, full_name: "Jane Updated" },
  });
  const result = await updateEmployee("emp-1", { full_name: "Jane Updated" });
  expect(employeeClient.put).toHaveBeenCalledWith("/employees/emp-1", {
   full_name: "Jane Updated",
  });
  expect(result.full_name).toBe("Jane Updated");
 });
});

describe("deleteEmployee", () => {
 it("calls DELETE /employees/:id", async () => {
  employeeClient.delete.mockResolvedValueOnce({ data: { message: "deleted" } });
  await deleteEmployee("emp-1");
  expect(employeeClient.delete).toHaveBeenCalledWith("/employees/emp-1");
 });
});

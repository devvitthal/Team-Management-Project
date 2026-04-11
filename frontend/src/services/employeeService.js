/** Employee service API calls. */
import { employeeClient } from "./api";

/**
 * Fetch all employees, optionally filtered.
 * @param {object} [params] - Query params (e.g. search, role).
 * @returns {Promise<object[]>}
 */
export const getEmployees = (params = {}) =>
 employeeClient.get("/employees", { params }).then((r) => r.data);

/**
 * Fetch a single employee by ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const getEmployee = (id) =>
 employeeClient.get(`/employees/${id}`).then((r) => r.data);

/**
 * Create a new employee record.
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createEmployee = (data) =>
 employeeClient.post("/employees", data).then((r) => r.data);

/**
 * Update an existing employee record.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateEmployee = (id, data) =>
 employeeClient.put(`/employees/${id}`, data).then((r) => r.data);

/**
 * Delete an employee record.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteEmployee = (id) =>
 employeeClient.delete(`/employees/${id}`).then((r) => r.data);

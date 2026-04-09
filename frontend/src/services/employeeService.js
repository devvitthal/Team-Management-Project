/** Employee service API calls. */
import { employeeClient } from "./api";

export const getEmployees = (params = {}) =>
 employeeClient.get("/employees", { params }).then((r) => r.data);

export const getEmployee = (id) =>
 employeeClient.get(`/employees/${id}`).then((r) => r.data);

export const createEmployee = (data) =>
 employeeClient.post("/employees", data).then((r) => r.data);

export const updateEmployee = (id, data) =>
 employeeClient.put(`/employees/${id}`, data).then((r) => r.data);

export const deleteEmployee = (id) =>
 employeeClient.delete(`/employees/${id}`).then((r) => r.data);

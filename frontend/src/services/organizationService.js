/** Organization service API calls for branches, departments, and teams. */
import { organizationClient } from "./api";

// Branches
export const getBranches = () =>
 organizationClient.get("/branches").then((r) => r.data);
export const getBranch = (id) =>
 organizationClient.get(`/branches/${id}`).then((r) => r.data);
export const createBranch = (data) =>
 organizationClient.post("/branches", data).then((r) => r.data);
export const updateBranch = (id, data) =>
 organizationClient.put(`/branches/${id}`, data).then((r) => r.data);
export const deleteBranch = (id) =>
 organizationClient.delete(`/branches/${id}`).then((r) => r.data);

// Departments
export const getDepartments = (branchId = "") =>
 organizationClient
  .get("/departments", { params: branchId ? { branch_id: branchId } : {} })
  .then((r) => r.data);
export const getDepartment = (id) =>
 organizationClient.get(`/departments/${id}`).then((r) => r.data);
export const createDepartment = (data) =>
 organizationClient.post("/departments", data).then((r) => r.data);
export const updateDepartment = (id, data) =>
 organizationClient.put(`/departments/${id}`, data).then((r) => r.data);
export const deleteDepartment = (id) =>
 organizationClient.delete(`/departments/${id}`).then((r) => r.data);

// Teams
export const getTeams = (departmentId = "") =>
 organizationClient
  .get("/teams", {
   params: departmentId ? { department_id: departmentId } : {},
  })
  .then((r) => r.data);
export const getTeam = (id) =>
 organizationClient.get(`/teams/${id}`).then((r) => r.data);
export const createTeam = (data) =>
 organizationClient.post("/teams", data).then((r) => r.data);
export const updateTeam = (id, data) =>
 organizationClient.put(`/teams/${id}`, data).then((r) => r.data);
export const deleteTeam = (id) =>
 organizationClient.delete(`/teams/${id}`).then((r) => r.data);

// Analytics
export const getOrgLeaderTeams = () =>
 organizationClient.get("/analytics/org-leader-teams").then((r) => r.data);

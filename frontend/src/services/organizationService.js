/** Organization service API calls for branches, departments, and teams. */
import { organizationClient } from "./api";

// Branches

/** @param {string} id @returns {Promise<object>} */
export const getBranch = (id) =>
 organizationClient.get(`/branches/${id}`).then((r) => r.data);

/**
 * Fetch all branches.
 * @returns {Promise<object[]>}
 */
export const getBranches = () =>
 organizationClient.get("/branches").then((r) => r.data);

/**
 * Create a new branch.
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createBranch = (data) =>
 organizationClient.post("/branches", data).then((r) => r.data);

/**
 * Update a branch.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateBranch = (id, data) =>
 organizationClient.put(`/branches/${id}`, data).then((r) => r.data);

/**
 * Delete a branch.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteBranch = (id) =>
 organizationClient.delete(`/branches/${id}`).then((r) => r.data);

// Departments

/**
 * Fetch all departments, optionally filtered by branch.
 * @param {string} [branchId]
 * @returns {Promise<object[]>}
 */
export const getDepartments = (branchId = "") =>
 organizationClient
  .get("/departments", { params: branchId ? { branch_id: branchId } : {} })
  .then((r) => r.data);

/** @param {string} id @returns {Promise<object>} */
export const getDepartment = (id) =>
 organizationClient.get(`/departments/${id}`).then((r) => r.data);

/**
 * Create a new department.
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createDepartment = (data) =>
 organizationClient.post("/departments", data).then((r) => r.data);

/**
 * Update a department.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateDepartment = (id, data) =>
 organizationClient.put(`/departments/${id}`, data).then((r) => r.data);

/**
 * Delete a department.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteDepartment = (id) =>
 organizationClient.delete(`/departments/${id}`).then((r) => r.data);

// Teams

/**
 * Fetch all teams, optionally filtered by department.
 * @param {string} [departmentId]
 * @returns {Promise<object[]>}
 */
export const getTeams = (departmentId = "") =>
 organizationClient
  .get("/teams", {
   params: departmentId ? { department_id: departmentId } : {},
  })
  .then((r) => r.data);

/** @param {string} id @returns {Promise<object>} */
export const getTeam = (id) =>
 organizationClient.get(`/teams/${id}`).then((r) => r.data);

/**
 * Create a new team.
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createTeam = (data) =>
 organizationClient.post("/teams", data).then((r) => r.data);

/**
 * Update a team.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateTeam = (id, data) =>
 organizationClient.put(`/teams/${id}`, data).then((r) => r.data);

/**
 * Delete a team.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteTeam = (id) =>
 organizationClient.delete(`/teams/${id}`).then((r) => r.data);

// Analytics

/**
 * Fetch teams and their members visible to the current org leader.
 * @returns {Promise<object[]>}
 */
export const getOrgLeaderTeams = () =>
 organizationClient.get("/analytics/org-leader-teams").then((r) => r.data);

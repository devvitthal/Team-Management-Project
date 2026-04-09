/**
 * Achievement service API calls.
 */
import { achievementClient } from "./api";

/** @param {object} params - Query parameters for filtering. */
export const getAchievements = (params = {}) =>
 achievementClient.get("/achievements", { params }).then((r) => r.data);

/** @param {string} id */
export const getAchievement = (id) =>
 achievementClient.get(`/achievements/${id}`).then((r) => r.data);

/** @param {object} data */
export const createAchievement = (data) =>
 achievementClient.post("/achievements", data).then((r) => r.data);

/** @param {string} id @param {object} data */
export const updateAchievement = (id, data) =>
 achievementClient.put(`/achievements/${id}`, data).then((r) => r.data);

/** @param {string} id */
export const deleteAchievement = (id) =>
 achievementClient.delete(`/achievements/${id}`).then((r) => r.data);

/** @param {string} id @param {string} status */
export const updateAchievementStatus = (id, status) =>
 achievementClient
  .patch(`/achievements/${id}/status`, null, { params: { new_status: status } })
  .then((r) => r.data);

// ── Team Summaries ─────────────────────────────────────────────────────────

/**
 * List team summaries with optional filters.
 * @param {object} params - Optional { team_id, month, year }.
 * @returns {Promise<Array>}
 */
export const getTeamSummaries = (params = {}) =>
 achievementClient
  .get("/achievements/team-summaries", { params })
  .then((r) => r.data);

/**
 * Create a monthly team achievement summary.
 * @param {object} data - { team_id, month, year, title, summary? }.
 * @returns {Promise<object>}
 */
export const createTeamSummary = (data) =>
 achievementClient
  .post("/achievements/team-summaries", data)
  .then((r) => r.data);

/**
 * Delete a team summary by ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteTeamSummary = (id) =>
 achievementClient
  .delete(`/achievements/team-summaries/${id}`)
  .then((r) => r.data);

/**
 * Return approved achievement counts grouped by team, month, and year.
 * @param {object} params - Optional { year }.
 * @returns {Promise<Array>} List of { team_id, month, year, approved_count }
 */
export const getTeamMonthlyStats = (params = {}) =>
 achievementClient
  .get("/analytics/team-monthly", { params })
  .then((r) => r.data);

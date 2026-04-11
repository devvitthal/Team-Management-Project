/** Achievement service API calls. */
import { achievementClient } from "./api";

/**
 * Fetch all achievements, optionally filtered.
 * @param {object} [params]
 * @returns {Promise<object[]>}
 */
export const getAchievements = (params = {}) =>
 achievementClient.get("/achievements", { params }).then((r) => r.data);

/**
 * Fetch a single achievement by ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const getAchievement = (id) =>
 achievementClient.get(`/achievements/${id}`).then((r) => r.data);

/**
 * Submit a new individual achievement.
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createAchievement = (data) =>
 achievementClient.post("/achievements", data).then((r) => r.data);

/**
 * Update an existing achievement.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<object>}
 */
export const updateAchievement = (id, data) =>
 achievementClient.put(`/achievements/${id}`, data).then((r) => r.data);

/**
 * Delete an achievement.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteAchievement = (id) =>
 achievementClient.delete(`/achievements/${id}`).then((r) => r.data);

/**
 * Update the status (pending/approved/rejected) of an achievement.
 * @param {string} id
 * @param {string} status
 * @returns {Promise<object>}
 */
export const updateAchievementStatus = (id, status) =>
 achievementClient
  .patch(`/achievements/${id}/status`, null, { params: { new_status: status } })
  .then((r) => r.data);

// Team Summaries

/**
 * Fetch all team summaries, optionally filtered.
 * @param {object} [params]
 * @returns {Promise<object[]>}
 */
export const getTeamSummaries = (params = {}) =>
 achievementClient
  .get("/achievements/team-summaries", { params })
  .then((r) => r.data);

/**
 * Create a new team summary.
 * @param {object} data
 * @returns {Promise<object>}
 */
export const createTeamSummary = (data) =>
 achievementClient
  .post("/achievements/team-summaries", data)
  .then((r) => r.data);

/**
 * Delete a team summary.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const deleteTeamSummary = (id) =>
 achievementClient
  .delete(`/achievements/team-summaries/${id}`)
  .then((r) => r.data);

/**
 * Fetch monthly achievement stats grouped by team.
 * @param {object} [params]
 * @returns {Promise<object[]>}
 */
export const getTeamMonthlyStats = (params = {}) =>
 achievementClient
  .get("/analytics/team-monthly", { params })
  .then((r) => r.data);

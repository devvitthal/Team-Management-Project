/** Achievement service API calls. */
import { achievementClient } from "./api";

export const getAchievements = (params = {}) =>
 achievementClient.get("/achievements", { params }).then((r) => r.data);

export const getAchievement = (id) =>
 achievementClient.get(`/achievements/${id}`).then((r) => r.data);

export const createAchievement = (data) =>
 achievementClient.post("/achievements", data).then((r) => r.data);

export const updateAchievement = (id, data) =>
 achievementClient.put(`/achievements/${id}`, data).then((r) => r.data);

export const deleteAchievement = (id) =>
 achievementClient.delete(`/achievements/${id}`).then((r) => r.data);

export const updateAchievementStatus = (id, status) =>
 achievementClient
  .patch(`/achievements/${id}/status`, null, { params: { new_status: status } })
  .then((r) => r.data);

// Team Summaries
export const getTeamSummaries = (params = {}) =>
 achievementClient
  .get("/achievements/team-summaries", { params })
  .then((r) => r.data);

export const createTeamSummary = (data) =>
 achievementClient
  .post("/achievements/team-summaries", data)
  .then((r) => r.data);

export const deleteTeamSummary = (id) =>
 achievementClient
  .delete(`/achievements/team-summaries/${id}`)
  .then((r) => r.data);

export const getTeamMonthlyStats = (params = {}) =>
 achievementClient
  .get("/analytics/team-monthly", { params })
  .then((r) => r.data);
/**
 * API integration tests for achievementService — mocks axios clients.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api", () => ({
 achievementClient: {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
 },
}));

import { achievementClient } from "../api";
import {
 getAchievements,
 getAchievement,
 createAchievement,
 updateAchievement,
 deleteAchievement,
 updateAchievementStatus,
 getTeamSummaries,
 createTeamSummary,
 deleteTeamSummary,
 getTeamMonthlyStats,
} from "../achievementService";

beforeEach(() => {
 vi.clearAllMocks();
});

const MOCK_ACHIEVEMENT = {
 id: "ach-1",
 title: "Shipped feature",
 status: "pending",
 month: 6,
 year: 2025,
};

describe("getAchievements", () => {
 it("calls GET /achievements with no params by default", async () => {
  achievementClient.get.mockResolvedValueOnce({ data: [MOCK_ACHIEVEMENT] });
  const result = await getAchievements();
  expect(achievementClient.get).toHaveBeenCalledWith("/achievements", {
   params: {},
  });
  expect(result).toHaveLength(1);
 });

 it("passes query params to the request", async () => {
  achievementClient.get.mockResolvedValueOnce({ data: [] });
  await getAchievements({ status: "pending", team_id: "t-1" });
  expect(achievementClient.get).toHaveBeenCalledWith("/achievements", {
   params: { status: "pending", team_id: "t-1" },
  });
 });
});

describe("getAchievement", () => {
 it("calls GET /achievements/:id", async () => {
  achievementClient.get.mockResolvedValueOnce({ data: MOCK_ACHIEVEMENT });
  const result = await getAchievement("ach-1");
  expect(achievementClient.get).toHaveBeenCalledWith("/achievements/ach-1");
  expect(result.id).toBe("ach-1");
 });
});

describe("createAchievement", () => {
 it("calls POST /achievements with the payload", async () => {
  achievementClient.post.mockResolvedValueOnce({ data: MOCK_ACHIEVEMENT });
  const result = await createAchievement({
   title: "Shipped feature",
   month: 6,
   year: 2025,
  });
  expect(achievementClient.post).toHaveBeenCalledWith("/achievements", {
   title: "Shipped feature",
   month: 6,
   year: 2025,
  });
  expect(result.title).toBe("Shipped feature");
 });
});

describe("updateAchievement", () => {
 it("calls PUT /achievements/:id with update data", async () => {
  achievementClient.put.mockResolvedValueOnce({
   data: { ...MOCK_ACHIEVEMENT, title: "Updated" },
  });
  const result = await updateAchievement("ach-1", { title: "Updated" });
  expect(achievementClient.put).toHaveBeenCalledWith("/achievements/ach-1", {
   title: "Updated",
  });
  expect(result.title).toBe("Updated");
 });
});

describe("deleteAchievement", () => {
 it("calls DELETE /achievements/:id", async () => {
  achievementClient.delete.mockResolvedValueOnce({
   data: { message: "deleted" },
  });
  const result = await deleteAchievement("ach-1");
  expect(achievementClient.delete).toHaveBeenCalledWith("/achievements/ach-1");
  expect(result.message).toBe("deleted");
 });
});

describe("updateAchievementStatus", () => {
 it("calls PATCH /achievements/:id/status with new_status param", async () => {
  achievementClient.patch.mockResolvedValueOnce({
   data: { ...MOCK_ACHIEVEMENT, status: "approved" },
  });
  const result = await updateAchievementStatus("ach-1", "approved");
  expect(achievementClient.patch).toHaveBeenCalledWith(
   "/achievements/ach-1/status",
   null,
   { params: { new_status: "approved" } },
  );
  expect(result.status).toBe("approved");
 });
});

describe("getTeamSummaries", () => {
 it("calls GET /achievements/team-summaries", async () => {
  achievementClient.get.mockResolvedValueOnce({ data: [] });
  await getTeamSummaries({ team_id: "t-1" });
  expect(achievementClient.get).toHaveBeenCalledWith(
   "/achievements/team-summaries",
   {
    params: { team_id: "t-1" },
   },
  );
 });
});

describe("createTeamSummary", () => {
 it("calls POST /achievements/team-summaries", async () => {
  const summary = { team_id: "t-1", month: 6, year: 2025, title: "June" };
  achievementClient.post.mockResolvedValueOnce({ data: summary });
  const result = await createTeamSummary(summary);
  expect(achievementClient.post).toHaveBeenCalledWith(
   "/achievements/team-summaries",
   summary,
  );
  expect(result.title).toBe("June");
 });
});

describe("deleteTeamSummary", () => {
 it("calls DELETE /achievements/team-summaries/:id", async () => {
  achievementClient.delete.mockResolvedValueOnce({
   data: { message: "deleted" },
  });
  await deleteTeamSummary("sum-1");
  expect(achievementClient.delete).toHaveBeenCalledWith(
   "/achievements/team-summaries/sum-1",
  );
 });
});

describe("getTeamMonthlyStats", () => {
 it("calls GET /analytics/team-monthly with params", async () => {
  achievementClient.get.mockResolvedValueOnce({ data: [] });
  await getTeamMonthlyStats({ year: 2025 });
  expect(achievementClient.get).toHaveBeenCalledWith(
   "/analytics/team-monthly",
   {
    params: { year: 2025 },
   },
  );
 });
});

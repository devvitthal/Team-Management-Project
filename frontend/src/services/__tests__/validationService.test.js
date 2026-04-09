/**
 * API integration tests for validationService — mocks axios client.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../api", () => ({
 validationClient: {
  get: vi.fn(),
  post: vi.fn(),
 },
}));

import { validationClient } from "../api";
import {
 getValidations,
 submitValidation,
 getValidation,
} from "../validationService";

beforeEach(() => {
 vi.clearAllMocks();
});

const MOCK_VALIDATION = {
 id: "val-1",
 achievement_id: "ach-1",
 action: "approved",
 comment: "Great work!",
 reviewer_id: "rev-1",
};

describe("getValidations", () => {
 it("calls GET /validations with no params by default", async () => {
  validationClient.get.mockResolvedValueOnce({ data: [MOCK_VALIDATION] });
  const result = await getValidations();
  expect(validationClient.get).toHaveBeenCalledWith("/validations", {
   params: {},
  });
  expect(result).toHaveLength(1);
 });

 it("passes achievement_id filter param", async () => {
  validationClient.get.mockResolvedValueOnce({ data: [] });
  await getValidations({ achievement_id: "ach-1" });
  expect(validationClient.get).toHaveBeenCalledWith("/validations", {
   params: { achievement_id: "ach-1" },
  });
 });
});

describe("submitValidation", () => {
 it("calls POST /validations with the payload and returns the record", async () => {
  validationClient.post.mockResolvedValueOnce({ data: MOCK_VALIDATION });
  const payload = {
   achievement_id: "ach-1",
   action: "approved",
   comment: "Great work!",
  };
  const result = await submitValidation(payload);
  expect(validationClient.post).toHaveBeenCalledWith("/validations", payload);
  expect(result.action).toBe("approved");
 });

 it("propagates server errors", async () => {
  const err = { response: { status: 403, data: { detail: "Forbidden" } } };
  validationClient.post.mockRejectedValueOnce(err);
  await expect(submitValidation({})).rejects.toEqual(err);
 });
});

describe("getValidation", () => {
 it("calls GET /validations/:id", async () => {
  validationClient.get.mockResolvedValueOnce({ data: MOCK_VALIDATION });
  const result = await getValidation("val-1");
  expect(validationClient.get).toHaveBeenCalledWith("/validations/val-1");
  expect(result.id).toBe("val-1");
 });
});

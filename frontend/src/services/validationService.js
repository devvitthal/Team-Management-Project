/** Validation service API calls. */
import { validationClient } from "./api";

/**
 * Fetch all validation records, optionally filtered.
 * @param {object} [params]
 * @returns {Promise<object[]>}
 */
export const getValidations = (params = {}) =>
 validationClient.get("/validations", { params }).then((r) => r.data);

/**
 * Submit a validation action (approve or reject) for an achievement.
 * @param {object} data
 * @returns {Promise<object>}
 */
export const submitValidation = (data) =>
 validationClient.post("/validations", data).then((r) => r.data);

/**
 * Fetch a single validation record by ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
export const getValidation = (id) =>
 validationClient.get(`/validations/${id}`).then((r) => r.data);

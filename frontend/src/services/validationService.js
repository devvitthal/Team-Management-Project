/** Validation service API calls. */
import { validationClient } from "./api";

export const getValidations = (params = {}) =>
 validationClient.get("/validations", { params }).then((r) => r.data);

export const submitValidation = (data) =>
 validationClient.post("/validations", data).then((r) => r.data);

export const getValidation = (id) =>
 validationClient.get(`/validations/${id}`).then((r) => r.data);

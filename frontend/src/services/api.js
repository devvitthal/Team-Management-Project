/** Axios instances for each backend microservice, routed through the API gateway. */
import axios from "axios";

const getToken = () => localStorage.getItem("access_token");

// All traffic goes through the single API gateway.
// Each client gets a base URL of {gateway}/api/v1/{service}.
const GATEWAY = import.meta.env.VITE_API_GATEWAY_URL || "";

const createServiceClient = (baseURL) => {
 const client = axios.create({ baseURL: baseURL || "" });

 client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
   config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
 });

 client.interceptors.response.use(
  (response) => response,
  (error) => {
   if (error.response?.status === 401) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
   }
   return Promise.reject(error);
  },
 );

 return client;
};

export const authClient = createServiceClient(`${GATEWAY}/api/v1/auth`);
export const employeeClient = createServiceClient(
 `${GATEWAY}/api/v1/employees`,
);
export const organizationClient = createServiceClient(
 `${GATEWAY}/api/v1/organizations`,
);
export const achievementClient = createServiceClient(
 `${GATEWAY}/api/v1/achievements`,
);
export const validationClient = createServiceClient(
 `${GATEWAY}/api/v1/validations`,
);

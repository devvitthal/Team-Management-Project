/** Axios instances for each backend microservice, routed through CloudFront (AWS) or the local proxy. */
import axios from "axios";

const getToken = () => localStorage.getItem("access_token");

// On AWS: VITE_API_URL is the CloudFront base URL (set by deploy-frontend.sh / generate-env.sh).
// Locally: VITE_API_URL is http://localhost:3001 (the CORS proxy).
// Each client base URL is {gateway}/api/{service-directory-name}, matching the CloudFront
// path pattern /api/{service-name}* and the local proxy's /api/{service-name} routing.
const GATEWAY = import.meta.env.VITE_API_URL || "";

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

export const authClient = createServiceClient(`${GATEWAY}/api/auth-service`);
export const employeeClient = createServiceClient(
 `${GATEWAY}/api/employee-service`,
);
export const organizationClient = createServiceClient(
 `${GATEWAY}/api/organization-service`,
);
export const achievementClient = createServiceClient(
 `${GATEWAY}/api/achievement-service`,
);
export const validationClient = createServiceClient(
 `${GATEWAY}/api/validation-service`,
);

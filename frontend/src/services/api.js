/** Axios instances for each backend microservice. */
import axios from "axios";

const getToken = () => localStorage.getItem("access_token");

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

export const authClient = createServiceClient(
 import.meta.env.VITE_AUTH_SERVICE_URL,
);
export const employeeClient = createServiceClient(
 import.meta.env.VITE_EMPLOYEE_SERVICE_URL,
);
export const organizationClient = createServiceClient(
 import.meta.env.VITE_ORGANIZATION_SERVICE_URL,
);
export const achievementClient = createServiceClient(
 import.meta.env.VITE_ACHIEVEMENT_SERVICE_URL,
);
export const validationClient = createServiceClient(
 import.meta.env.VITE_VALIDATION_SERVICE_URL,
);

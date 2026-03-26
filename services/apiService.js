import axios from "axios";
import Cookies from "js-cookie";

const LOGOUT_KEYS = [
  "authToken",
  "darkMode",
  "permissions",
  "primaryHsl",
  "user",
  "whiteLabelTheme",
];

let isLogoutInProgress = false;
export const SESSION_EXPIRED_EVENT = "fleetbharat:session-expired";

const PUBLIC_AUTH_ROUTES = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-2fa",
]);

const isPublicAuthRoute = (url = "") => {
  const cleanUrl = url.split("?")[0];
  return PUBLIC_AUTH_ROUTES.has(cleanUrl);
};

const clearAuthState = () => {
  LOGOUT_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
  Cookies.remove("authToken", { path: "/" });
};

const triggerSessionExpired = (statusCode) => {
  if (typeof window === "undefined" || isLogoutInProgress) return;

  isLogoutInProgress = true;
  clearAuthState();
  window.dispatchEvent(
    new CustomEvent(SESSION_EXPIRED_EVENT, {
      detail: { statusCode },
    }),
  );
};

const attachApiInterceptors = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const requestUrl = config?.url || "";

      if (typeof window !== "undefined" && !isPublicAuthRoute(requestUrl)) {
        const token = localStorage.getItem("authToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      } else if (!config.headers["Content-Type"]) {
        config.headers["Content-Type"] = "application/json";
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const requestUrl = error?.config?.url || "";
      const statusCode = error?.response?.status;
      const isAuthExpired = statusCode === 401 || statusCode === 403;
      if (isAuthExpired && !isPublicAuthRoute(requestUrl)) {
        triggerSessionExpired(statusCode);
      }
      return Promise.reject(error);
    },
  );

  return instance;
};

const api = attachApiInterceptors(
  axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000",
  }),
);

export const tmsApi = attachApiInterceptors(
  axios.create({
    baseURL:
      process.env.NEXT_PUBLIC_TMS_API_BASE_URL || "http://localhost:8081",
  }),
);

export const javaApi = attachApiInterceptors(
  axios.create({
    baseURL:
      process.env.NEXT_PUBLIC_JAVA_API_BASE_URL || "http://localhost:8083/api/v1/",
  }),
);

// Separate instance for VTS (map) API
export const vtsApi = axios.create({
  baseURL: "/vts-proxy",
});

export default api;

import axios from "axios";

export const TOKEN_STORAGE_KEY = "insureai_token";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: inject JWT Bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 Unauthorized responses cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear expired or invalid token
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      // Dispatch custom event so AuthContext can synchronize state
      window.dispatchEvent(new Event("insureai:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export default api;
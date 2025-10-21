import axios from "axios";
import { getAuth } from "firebase/auth";
import { firebaseApp } from "@/lib/firebase";

const API_BASE = import.meta.env.DEV
  ? import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
  : window.location.origin;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 8000,
});

// attach ID token if logged in
api.interceptors.request.use(async (config) => {
  const auth = getAuth(firebaseApp);
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

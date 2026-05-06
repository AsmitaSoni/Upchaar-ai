// ─────────────────────────────────────────────
// 🔌 CENTRAL API CONFIGURATION
// ─────────────────────────────────────────────
// Vite proxy handles /api and /chat → http://localhost:3001
// File uploads use DIRECT URL to avoid proxy stripping multipart headers

export const BACKEND_URL = "http://localhost:3001";  // used for file uploads only
export const BASE_URL    = "";                        // relative — uses Vite proxy

export const API_ROUTES = {
  // Auth
  LOGIN:          `${BASE_URL}/api/auth/login`,
  REGISTER:       `${BASE_URL}/api/auth/register`,
  ME:             `${BASE_URL}/api/auth/me`,
  UPDATE_PROFILE: `${BASE_URL}/api/auth/me`,

  // Chat
  CHAT: `${BASE_URL}/chat`,

  // Prescription — DIRECT URL to avoid Vite proxy mangling multipart
  PRESCRIPTION_UPLOAD: `${BACKEND_URL}/api/prescription/upload`,

  // Records
  RECORDS: `${BASE_URL}/api/records`,

  // Alerts & Prediction
  ALERTS:     `${BASE_URL}/api/alerts`,
  PREDICTION: `${BASE_URL}/api/prediction`,
};

export function authHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

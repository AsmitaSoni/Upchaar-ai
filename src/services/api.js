import { API_ROUTES, authHeader } from "../config/apiConfig";

async function request(url, options = {}) {
  try {
    const res  = await fetch(url, options);
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Network error →", url, err.message);
    return { success: false, error: "Cannot reach server. Make sure the backend is running on port 3001." };
  }
}

// ── AUTH ──────────────────────────────────────
export const registerUser  = (data) => request(API_ROUTES.REGISTER, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const loginUser     = (data) => request(API_ROUTES.LOGIN,    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
export const fetchProfile  = ()     => request(API_ROUTES.ME,       { headers: { "Content-Type": "application/json", ...authHeader() } });
export const updateProfile = (data) => request(API_ROUTES.UPDATE_PROFILE, { method: "PUT", headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(data) });

// ── CHAT ──────────────────────────────────────
export const sendChatMessage = (messages, prescriptionContext = null) =>
  request(API_ROUTES.CHAT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, prescriptionContext }),
  });

// ── PRESCRIPTION UPLOAD ───────────────────────
export const uploadPrescription = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  try {
    const res  = await fetch(API_ROUTES.PRESCRIPTION_UPLOAD, { method: "POST", headers: { ...authHeader() }, body: formData });
    return await res.json();
  } catch (err) {
    return { success: false, error: "Upload failed: " + err.message };
  }
};

// ── RECORDS ───────────────────────────────────
export const saveRecord   = (data) => request(API_ROUTES.RECORDS,         { method: "POST",   headers: { "Content-Type": "application/json", ...authHeader() }, body: JSON.stringify(data) });
export const fetchRecords = ()     => request(API_ROUTES.RECORDS,         { headers: { "Content-Type": "application/json", ...authHeader() } });
export const deleteRecord = (id)   => request(`${API_ROUTES.RECORDS}/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json", ...authHeader() } });

// ── ALERTS ────────────────────────────────────
export const fetchAlerts = () => request(API_ROUTES.ALERTS, { headers: { "Content-Type": "application/json", ...authHeader() } });

// ── PREDICTION ────────────────────────────────
export const fetchPrediction = (city = "") =>
  request(`${API_ROUTES.PREDICTION}${city ? "?city=" + encodeURIComponent(city) : ""}`, {
    headers: { "Content-Type": "application/json" },
  });

// ── LOCATION ─────────────────────────────────
export const reverseGeocode = (lat, lng) =>
  request(`/api/location/geocode?lat=${lat}&lng=${lng}`);

export const saveUserLocation = (city, state) =>
  request("/api/location/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ city, state }),
  });

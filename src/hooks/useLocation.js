// ─────────────────────────────────────────────
// 📍 useLocation — auto-detects browser location,
//    reverse-geocodes it, and saves it to DB
// ─────────────────────────────────────────────
import { useState, useEffect, useCallback } from "react";
import { reverseGeocode, saveUserLocation } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useLocationDetect() {
  const { user, isAuthenticated, login } = useAuth();

  const [location,      setLocation]      = useState({ city: user?.city || "", state: "" });
  const [detecting,     setDetecting]     = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationSaved, setLocationSaved] = useState(false);

  // Auto-detect on first login if city is not already saved
  useEffect(() => {
    if (isAuthenticated && !user?.city) {
      detectAndSave();
    } else if (user?.city) {
      setLocation({ city: user.city, state: user.state || "" });
      setLocationSaved(true);
    }
  }, [isAuthenticated, user?.city]);

  const detectAndSave = useCallback(async () => {
    if (!isAuthenticated) return;
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported by your browser.");
      return;
    }

    setDetecting(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          console.log("📍 GPS coords:", latitude, longitude);

          const geo = await reverseGeocode(latitude, longitude);
          if (!geo.success) throw new Error(geo.error);

          const { city, state } = geo;
          setLocation({ city, state });

          // Save to DB
          const saveRes = await saveUserLocation(city, state);
          if (saveRes.success) {
            setLocationSaved(true);
            // Update AuthContext so dashboard shows correct city immediately
            const token = localStorage.getItem("token");
            if (user) {
              const updated = { ...user, city, state };
              login(updated, token);
            }
            console.log("✅ Location saved:", city, state);
          }
        } catch (err) {
          console.error("Location error:", err.message);
          setLocationError("Could not resolve your location. You can set it manually in Profile.");
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === 1) {
          setLocationError("Location permission denied. Please set your city manually in Profile.");
        } else {
          setLocationError("Could not get location. Please set it manually in Profile.");
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, [isAuthenticated, user]);

  return { location, detecting, locationError, locationSaved, detectAndSave };
}

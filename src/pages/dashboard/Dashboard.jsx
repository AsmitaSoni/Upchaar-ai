import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ChatSection from "./ChatSection";
import RecordsSection from "./RecordsSection";
import PredictionSection from "./PredictionSection";
import ChatPreviewCard from "./ChatPreviewCard";
import RecordsPreviewCard from "./RecordsPreviewCard";
import PredictionPreviewCard from "./PredictionPreviewCard";
import Profile from "../patient/Profile";
import { useLocation } from "react-router-dom";
import { useLocationDetect } from "../../hooks/useLocation";
import { useAuth } from "../../context/AuthContext";

function Dashboard() {
  const [active, setActive] = useState(null);
  const location = useLocation();
  const { user } = useAuth();

  const { location: detectedLocation } = useLocationDetect();

  const city = user?.city || detectedLocation?.city || "Unknown";

  useEffect(() => {
    if (location.state?.refresh) setActive(null);
  }, [location.state]);

  useEffect(() => {
    const handler = () => setActive("profile");
    window.addEventListener("openProfile", handler);
    return () => window.removeEventListener("openProfile", handler);
  }, []);

  return (
    <div className="h-full bg-gray-50 dark:bg-[#0b1220] px-4 py-4">
      <div className="relative w-full max-w-[1400px] mx-auto h-[calc(100vh-100px)]">

        {/* DASHBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">

          {/* LEFT */}
          <ChatPreviewCard onClick={() => setActive("chat")} />

          {/* RIGHT */}
          <div className="flex flex-col gap-4">
            <RecordsPreviewCard onClick={() => setActive("records")} />

            <PredictionPreviewCard
              onClick={() => setActive("prediction")}
              locationLabel={city}   // ✅ cleaner label
            />
          </div>
        </div>

        {/* EXPANDED PANEL */}
        <AnimatePresence>
          {active && (
            <motion.div
              className="absolute inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                layoutId={`${active}-card`}
                className="h-full w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-4 flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setActive(null)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
                  >
                    ← Back
                  </button>
                </div>

                <div className="flex-1 min-h-0">
                  {active === "chat" && <ChatSection />}
                  {active === "records" && <RecordsSection />}
                  {active === "prediction" && <PredictionSection />}
                  {active === "profile" && <Profile />}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default Dashboard;
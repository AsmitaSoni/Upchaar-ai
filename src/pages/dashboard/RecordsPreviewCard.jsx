import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchRecords } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function RecordsPreviewCard({ onClick }) {
  const { isAuthenticated } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    fetchRecords()
      .then((res) => { if (res.success) setRecords(res.records?.slice(0, 3) || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <motion.div layoutId="records-card" onClick={onClick}
      className="flex-1 cursor-pointer rounded-2xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 shadow-[0_1px_2px_rgba(0,0,0,0.06)] p-6 flex flex-col justify-between overflow-hidden ring-1 ring-black/5 dark:ring-white/10">

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Previous Records</h2>
        <p className="text-sm text-gray-400 mt-1">Access your medical history</p>
      </div>

      <div className="mt-4 space-y-2.5 flex-1 overflow-hidden">
        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map((i) => <div key={i} className="h-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No records yet. Start a chat!</p>
        ) : (
          records.map((r) => (
            <div key={r._id} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm text-gray-800 dark:text-gray-200">
              <span className="font-medium capitalize">
                {r.symptoms?.length ? r.symptoms.slice(0, 2).join(", ") : "Consultation"}
              </span>
              <span className="text-gray-400 dark:text-gray-500"> • {formatDate(r.createdAt)}</span>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-400">Secure storage</span>
        <span className="text-sm font-medium text-primary">View →</span>
      </div>
    </motion.div>
  );
}

export default RecordsPreviewCard;

import { useState, useEffect } from "react";
import { fetchRecords, deleteRecord } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function RecordsSection() {
  const { isAuthenticated } = useAuth();
  const [records,  setRecords]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) { setLoading(false); return; }
    loadRecords();
  }, [isAuthenticated]);

  const loadRecords = async () => {
    try {
      setLoading(true); setError(null);
      const data = await fetchRecords();
      if (data.success) setRecords(data.records);
      else setError("Failed to load records.");
    } catch { setError("Could not connect to server."); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r._id !== id));
      if (expanded === id) setExpanded(null);
    } catch { alert("Failed to delete."); }
    finally { setDeleting(null); }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (!isAuthenticated) return (
    <div>
      <h2 className="text-xl font-semibold text-gray-200 mb-2">Previous Records</h2>
      <p className="text-gray-400">Please log in to view your records.</p>
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Previous Records</h2>
          {!loading && records.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{records.length} session{records.length !== 1 ? "s" : ""} saved</p>
          )}
        </div>
        <button onClick={loadRecords} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50">
          Refresh
        </button>
      </div>

      {/* States */}
      {loading && (
        <div className="space-y-3 flex-1">
          {[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && records.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-5xl mb-3">💬</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">No records yet.</p>
          <p className="text-gray-400 text-xs mt-1">Start a chat to create your first health record.</p>
        </div>
      )}

      {/* Records list */}
      {!loading && records.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
          {records.map((record) => (
            <div key={record._id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">

              {/* Record header */}
              <div className="flex items-start justify-between p-4">
                <div className="flex-1 min-w-0">
                  {/* Date */}
                  <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(record.createdAt)}</p>

                  {/* Location + name */}
                  {record.location && record.location !== "Unknown" && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">📍 {record.location}</p>
                  )}

                  {/* Symptoms */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {record.symptoms?.length > 0
                      ? record.symptoms.map((s, i) => (
                          <span key={i} className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs capitalize font-medium">
                            {s}
                          </span>
                        ))
                      : <span className="text-xs text-gray-400 italic">General consultation</span>
                    }
                  </div>

                  {/* Existing diseases */}
                  {record.diseases && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1.5">
                      🏥 Known: {record.diseases}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-3 shrink-0">
                  <button
                    onClick={() => setExpanded(expanded === record._id ? null : record._id)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                    {expanded === record._id ? "Hide" : "View"}
                  </button>
                  <button
                    onClick={() => handleDelete(record._id)}
                    disabled={deleting === record._id}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition disabled:opacity-50">
                    {deleting === record._id ? "…" : "Delete"}
                  </button>
                </div>
              </div>

              {/* Expanded conversation */}
              {expanded === record._id && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-4 space-y-2 bg-gray-50 dark:bg-gray-900/50">
                  {record.messages?.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`px-3 py-2 rounded-xl text-xs max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-white"
                          : "bg-white dark:bg-gray-700 text-gray-800 dark:text-white border dark:border-gray-600"
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default RecordsSection;

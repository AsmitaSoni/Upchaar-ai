import { useState, useEffect } from "react";
import { fetchPrediction, fetchAlerts } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const riskColors = {
  Low:      "text-green-600  bg-green-50   dark:bg-green-900/30  dark:text-green-400  border-green-200  dark:border-green-800",
  Moderate: "text-yellow-600 bg-yellow-50  dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  High:     "text-red-600    bg-red-50     dark:bg-red-900/30    dark:text-red-400    border-red-200    dark:border-red-800",
  Critical: "text-red-700    bg-red-100    dark:bg-red-900/50    dark:text-red-300    border-red-400    dark:border-red-700",
};

const alertIcons = { Moderate: "⚠️", High: "🚨", Critical: "🆘" };

function PredictionSection() {
  const { user, isAuthenticated } = useAuth();
  const [data,    setData]    = useState(null);
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [cityFilter, setCityFilter] = useState(user?.city || "");
  const userCity = user?.city || "";

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const [predRes, alertRes] = await Promise.all([
        fetchPrediction(cityFilter),
        isAuthenticated ? fetchAlerts() : Promise.resolve({ alerts: [] }),
      ]);
      if (predRes.success) setData(predRes);
      else setError("Could not fetch prediction data.");
      if (alertRes.success) setAlerts(alertRes.alerts || []);
    } catch { setError("Could not connect to server."); }
    finally { setLoading(false); }
  };

  const maxCount = data?.symptomFrequency?.[0]?.count || 1;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Predictive Analysis</h2>
          <p className="text-xs text-gray-400 mt-0.5">Real-time disease trends by location</p>
        </div>
        <button onClick={load} disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 transition disabled:opacity-50">
          Refresh
        </button>
      </div>

      {/* City filter */}
      <div className="flex gap-2 mb-4 shrink-0">
        <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Filter by city (e.g. Mumbai)"
          className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary/40" />
        <button onClick={load}
          className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:opacity-90 transition font-medium">
          Apply
        </button>
      </div>

      {loading && (
        <div className="space-y-3 flex-1">
          {[1,2,3,4].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      )}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && data && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">

          {/* 🚨 Active Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="animate-pulse">🚨</span> Active Alerts in Your Area
              </h3>
              {alerts.map((alert) => (
                <div key={alert._id}
                  className={`rounded-xl p-3 border text-sm font-medium ${riskColors[alert.riskLevel] || riskColors["Moderate"]}`}>
                  <div className="flex items-center gap-2">
                    <span>{alertIcons[alert.riskLevel] || "⚠️"}</span>
                    <span className="font-semibold capitalize">{alert.riskLevel} Alert</span>
                    <span className="text-xs opacity-70">· {alert.area}</span>
                  </div>
                  <p className="mt-1 text-xs font-normal opacity-90">{alert.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-primary">{data.totalCases}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cases (last 30 days)</p>
            </div>
            <div className={`rounded-xl p-4 text-center border ${riskColors[data.prediction?.riskLevel] || riskColors["Low"]}`}>
              <p className="text-2xl font-bold">{data.prediction?.riskLevel || "Low"}</p>
              <p className="text-xs mt-1 opacity-80">Risk Level</p>
            </div>
          </div>

          {/* Likely conditions */}
          {data.prediction?.topConditions && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">🔬 Likely Conditions</h3>
              <div className="flex flex-wrap gap-2">
                {data.prediction.topConditions.map((c, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Symptom frequency */}
          {data.symptomFrequency?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📊 Symptom Frequency</h3>
              <div className="space-y-2.5">
                {data.symptomFrequency.slice(0, 7).map(({ symptom, count }) => (
                  <div key={symptom} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 dark:text-gray-300 w-24 capitalize shrink-0">{symptom}</span>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right shrink-0">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Area breakdown */}
          {data.areaBreakdown?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">📍 Cases by Location</h3>
              <div className="space-y-2">
                {data.areaBreakdown.map(({ area, count }) => (
                  <div key={area} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300 text-xs">{area}</span>
                    <span className="font-semibold text-primary text-xs">{count} case{count !== 1 ? "s" : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advisory */}
          {data.prediction?.advisory && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1">💡 Health Advisory</h3>
              <p className="text-sm text-blue-600 dark:text-blue-300">{data.prediction.advisory}</p>
            </div>
          )}

          {/* Prevention tips */}
          {data.prediction?.preventionTips && (
            <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">🛡️ Prevention Tips</h3>
              <ul className="space-y-1.5">
                {data.prediction.preventionTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span className="text-green-500 mt-0.5 shrink-0">✓</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.totalCases === 0 && (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm">No cases reported yet in {cityFilter || "your area"}.</p>
              <p className="text-xs mt-1">Data appears after patients start logging symptoms.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PredictionSection;

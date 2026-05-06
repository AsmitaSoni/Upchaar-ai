import { motion } from "framer-motion";

function PredictionPreviewCard({ onClick, locationLabel }) {
  return (
    <motion.div
      layoutId="prediction-card"
      onClick={onClick}
      className="flex-1 cursor-pointer rounded-2xl 
      bg-white dark:bg-gray-900
      border border-gray-300 dark:border-gray-700
      shadow-[0_1px_2px_rgba(0,0,0,0.06)]
      p-6 flex flex-col justify-between
      ring-1 ring-black/5 dark:ring-white/10
      h-full overflow-hidden"
    >

      {/* HEADER */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Nearby Prediction
          </h2>

          <p className="text-sm text-gray-400 mt-1">
            Health trends in your area
          </p>
        </div>

        {/* GREEN HIGHLIGHT BADGE */}
        {locationLabel && (
          <span
            className="flex items-center gap-1 text-xs font-medium 
            px-3 py-1.5 rounded-full
            bg-green-100 text-green-700
            dark:bg-green-900/30 dark:text-green-400
            border border-green-200 dark:border-green-700
            shadow-sm whitespace-nowrap"
          >
            📍 {locationLabel}
          </span>
        )}
      </div>

      {/* CONTENT */}
      <div className="mt-4 space-y-3 flex-1">

        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm 
        text-gray-800 dark:text-gray-200 flex justify-between items-center w-full">
          <span className="truncate">Flu Cases</span>
          <span className="text-red-500 font-medium whitespace-nowrap">↑ High</span>
        </div>

        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm 
        text-gray-800 dark:text-gray-200 flex justify-between items-center w-full">
          <span className="truncate">Dengue Risk</span>
          <span className="text-yellow-500 font-medium whitespace-nowrap">Medium</span>
        </div>

        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm 
        text-gray-800 dark:text-gray-200 flex justify-between items-center w-full">
          <span className="truncate">Air Quality</span>
          <span className="text-green-500 font-medium whitespace-nowrap">Good</span>
        </div>

      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-gray-400">
          Real-time insights
        </span>

        <span className="text-sm font-medium text-primary whitespace-nowrap">
          Explore →
        </span>
      </div>

    </motion.div>
  );
}

export default PredictionPreviewCard;
import { motion } from "framer-motion";

function StatsSection() {
  const stats = [
    { value: "24/7", label: "Availability" },
    { value: "Instant", label: "Analysis" },
    { value: "Secure", label: "Storage" },
  ];

  return (
    <section className="py-20">

      <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">

        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-xl bg-white dark:bg-gray-900 
            border border-gray-200 dark:border-gray-700 
            shadow-sm hover:shadow-md transition"
          >
            <h3 className="text-2xl md:text-3xl font-bold text-primary">
              {s.value}
            </h3>

            <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm md:text-base">
              {s.label}
            </p>
          </motion.div>
        ))}

      </div>
    </section>
  );
}

export default StatsSection;
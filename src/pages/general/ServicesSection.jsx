import { motion } from "framer-motion";

const services = [
  "Symptom Analysis",
  "Health Records",
  "AI Insights",
  "Nearby Prediction"
];

function ServicesSection() {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">

      <div className="max-w-6xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Our Services
        </h2>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-6">

          {services.map((item, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -8, scale: 1.03 }}
              className="p-6 rounded-2xl
                bg-white/60 dark:bg-gray-800/50
                backdrop-blur-md border border-gray-200 dark:border-gray-700
                shadow-md cursor-pointer"
            >
              <p className="font-semibold text-gray-800 dark:text-white">
                {item}
              </p>
            </motion.div>
          ))}

        </div>
      </div>
    </section>
  );
}

export default ServicesSection;
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

function HeroSection() {
  const navigate = useNavigate();
  return (
    <section id="hero" className="relative pt-[120px] pb-20 overflow-hidden">

      {/* 🔥 GRADIENT LIGHTING */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-100px] left-[-100px] w-[400px] h-[400px] bg-primary/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">

        {/* LEFT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900 dark:text-white">
            Smart Healthcare <br />
            <span className="text-primary">Powered by AI</span>
          </h1>

          <p className="mt-6 text-gray-600 dark:text-gray-300 text-lg">
            Get AI-powered health insights, predict risks in your area, 
            and manage your health records — all in one intelligent platform.
          </p>

          <div className="mt-8 flex gap-4">
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 bg-primary text-white rounded-xl shadow-lg hover:scale-105 transition"
            >
              Get Started
            </button>

            <button
              onClick={() => {
                const section = document.getElementById("about");
                section?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 
              text-gray-800 dark:text-gray-200
              rounded-xl 
              hover:bg-gray-100 dark:hover:bg-gray-800 
              transition"
            >
              Learn More
            </button>
          </div>
        </motion.div>

        {/* RIGHT */}
        <motion.div
          className="relative flex justify-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
        >

          <motion.img
            src="https://img.freepik.com/free-vector/doctor-character-background_1270-84.jpg"
            className="w-full max-w-md rounded-2xl shadow-xl"
            animate={{ y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 4 }}
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3
            bg-white/20 dark:bg-gray-800/30
            backdrop-blur-md border border-white/30
            rounded-xl shadow-xl">

            <p className="text-sm font-medium text-gray-800 dark:text-white">
              AI Insights ⚡ Local Predictions
            </p>
          </div>

        </motion.div>

      </div>
    </section>
  );
}

export default HeroSection;
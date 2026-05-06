function AboutSection() {
  return (
    <section
      id="about"   // ✅ IMPORTANT (for scroll)
      className="py-20 bg-gray-50 dark:bg-gray-900 text-center px-6"
    >
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
        About Upchaar
      </h2>

      <p className="mt-4 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
        Upchaar is an AI-powered platform that helps you understand symptoms,
        track health records, and get real-time insights based on your location.
      </p>
    </section>
  );
}

export default AboutSection;
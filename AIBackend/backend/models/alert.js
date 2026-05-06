const mongoose = require("mongoose");

// Stores outbreak alerts triggered by symptom clustering in an area
const alertSchema = new mongoose.Schema(
  {
    area:         { type: String, required: true },   // city or state
    symptom:      { type: String, required: true },   // dominant symptom
    caseCount:    { type: Number, required: true },   // how many cases triggered it
    riskLevel:    { type: String, enum: ["Moderate", "High", "Critical"], default: "Moderate" },
    message:      { type: String, required: true },   // human-readable alert text
    isActive:     { type: Boolean, default: true },   // deactivate when resolved
    triggeredAt:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Alert", alertSchema);

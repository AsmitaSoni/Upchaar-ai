require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const axios     = require("axios");
const bcrypt    = require("bcryptjs");
const jwt       = require("jsonwebtoken");
const mongoose  = require("mongoose");
const multer    = require("multer");
const path      = require("path");
const fs        = require("fs");

const { searchMedical } = require("./advancedRag");
const Case          = require("./models/case");
const User          = require("./models/user");
const PatientRecord = require("./models/patientRecord");
const Alert         = require("./models/alert");
const connectDB     = require("./db");

connectDB();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const JWT_SECRET = process.env.JWT_SECRET || "healthcare_jwt_secret_fallback";

// ── Request logger ─────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// ── Multer — PDF/image uploads (stored in memory) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only PDF and images allowed"));
  },
});

// ─────────────────────────────────────────────
// 🔐 AUTH MIDDLEWARE
// ─────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ success: false, error: "Not authenticated. Please log in again." });
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, error: "Session expired. Please log in again." });
  }
}

// ─────────────────────────────────────────────
// 🧠 HELPERS
// ─────────────────────────────────────────────
function detectSymptoms(text) {
  const t = text.toLowerCase();
  const map = {
    fever: ["fever", "temperature", "hot"],
    cough: ["cough", "coughing"],
    headache: ["headache", "head pain", "migraine"],
    fatigue: ["fatigue", "tired", "weakness", "exhausted"],
    cold: ["cold", "runny nose", "sneezing"],
    pain: ["pain", "ache", "aching"],
    vomiting: ["vomit", "nausea", "nauseous"],
    diarrhea: ["diarrhea", "loose stool", "loose motion"],
    breathlessness: ["breathless", "short of breath", "difficulty breathing"],
    chestPain: ["chest pain", "chest tightness"],
    rash: ["rash", "skin rash", "itching", "hives"],
    jointPain: ["joint pain", "joint ache", "arthritis"],
  };
  return Object.entries(map)
    .filter(([, keywords]) => keywords.some((k) => t.includes(k)))
    .map(([symptom]) => symptom);
}

function getMissingInfo(text) {
  const t = text.toLowerCase();
  const missing = [];
  if (!/(day|days|week|since|ago)/.test(t))           missing.push("duration");
  if (!/\b(99|100|101|102|103|104|mild|moderate|severe)\b/.test(t)) missing.push("severity");
  if (!detectSymptoms(t).length)                       missing.push("symptoms");
  if (!/(diabetes|bp|asthma|thyroid|none|no history)/.test(t))   missing.push("medical history");
  if (!/(medicine|medication|taking|none|no medication)/.test(t)) missing.push("current medications");
  return missing;
}

function isCrossQuestion(text) { return /\?|what|why|how|should|can|is it/i.test(text); }
function isSevere(text)        { return /(chest pain|difficulty breathing|fainting|seizure|unconscious)/i.test(text); }

// ─────────────────────────────────────────────
// 📊 OUTBREAK ALERT ENGINE
// ─────────────────────────────────────────────
// Called every time a PatientRecord is saved.
// If a symptom appears 5+ times from patients in the same city within 7 days → trigger alert.
async function checkAndTriggerAlerts(location, symptoms) {
  if (!location || location === "Unknown" || !symptoms.length) return;

  const since = new Date();
  since.setDate(since.getDate() - 7);

  for (const symptom of symptoms) {
    // Count recent records with this symptom from same location
    const count = await PatientRecord.countDocuments({
      location: { $regex: location.split(",")[0], $options: "i" },
      symptoms: symptom,
      createdAt: { $gte: since },
    });

    const thresholds = { Critical: 15, High: 10, Moderate: 5 };
    let riskLevel = null;
    if (count >= thresholds.Critical) riskLevel = "Critical";
    else if (count >= thresholds.High) riskLevel = "High";
    else if (count >= thresholds.Moderate) riskLevel = "Moderate";

    if (riskLevel) {
      // Don't duplicate — check if active alert already exists for this area+symptom
      const existing = await Alert.findOne({
        area: { $regex: location.split(",")[0], $options: "i" },
        symptom,
        isActive: true,
        triggeredAt: { $gte: since },
      });

      if (!existing) {
        const alert = await Alert.create({
          area:      location,
          symptom,
          caseCount: count,
          riskLevel,
          message:   `⚠️ ${riskLevel} alert: ${count} cases of ${symptom} reported in ${location} in the last 7 days. Take precautions.`,
        });
        console.log(`  🚨 Alert triggered! ${riskLevel} — ${symptom} in ${location} (${count} cases)`);
      }
    }
  }
}

// ─────────────────────────────────────────────
// ✅ HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  const states = { 0:"disconnected", 1:"connected", 2:"connecting", 3:"disconnecting" };
  res.json({ status:"Backend running ✅", mongodb: states[mongoose.connection.readyState], time: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// 🔐 REGISTER
// ─────────────────────────────────────────────
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log("  📝 Register:", req.body.email);
    const { name, email, password, age, gender, bloodGroup } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(400).json({ success: false, message: "This email is already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(), email: email.toLowerCase().trim(), password: hashedPassword,
      age: age ? Number(age) : null, gender: gender || null, bloodGroup: bloodGroup || null,
    });

    console.log("  ✅ Registered:", user.email);
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    return res.status(201).json({ success: true, token,
      user: { id: user._id, name: user.name, email: user.email, age: user.age, gender: user.gender, bloodGroup: user.bloodGroup }
    });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: "This email is already registered" });
    return res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});

// ─────────────────────────────────────────────
// 🔐 LOGIN
// ─────────────────────────────────────────────
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log("  🔑 Login:", req.body.email);
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required" });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    const token = jwt.sign({ id: user._id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    console.log("  ✅ Login:", user.email);
    return res.json({ success: true, token,
      user: { id: user._id, name: user.name, email: user.email, age: user.age, gender: user.gender, bloodGroup: user.bloodGroup, city: user.city }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});

// ─────────────────────────────────────────────
// 👤 GET / UPDATE PROFILE
// ─────────────────────────────────────────────
app.get("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Server error" });
  }
});

app.put("/api/auth/me", authMiddleware, async (req, res) => {
  try {
    const {
      name, age, gender, bloodGroup, phone, emergencyContact,
      city, state, diseases, allergies, medications, height, weight, smoking, alcohol
    } = req.body;
    console.log("  ✏️  Update profile:", req.user.email);

    const fields = {};
    if (name?.trim())               fields.name             = name.trim();
    if (age !== undefined)          fields.age              = age === "" ? null : Number(age);
    if (gender !== undefined)       fields.gender           = gender || null;
    if (bloodGroup !== undefined)   fields.bloodGroup       = bloodGroup || null;
    if (phone !== undefined)        fields.phone            = phone;
    if (emergencyContact !== undefined) fields.emergencyContact = emergencyContact;
    if (city !== undefined)         fields.city             = city;
    if (state !== undefined)        fields.state            = state;
    if (diseases !== undefined)     fields.diseases         = diseases;
    if (allergies !== undefined)    fields.allergies        = allergies;
    if (medications !== undefined)  fields.medications      = medications;
    if (height !== undefined)       fields.height           = height === "" ? null : Number(height);
    if (weight !== undefined)       fields.weight           = weight === "" ? null : Number(weight);
    if (smoking)                    fields.smoking          = smoking;
    if (alcohol)                    fields.alcohol          = alcohol;

    const user = await User.findByIdAndUpdate(req.user.id, { $set: fields }, { new: true, runValidators: false }).select("-password");
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    console.log("  ✅ Profile saved:", user.email, "| city:", user.city);
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to save: " + err.message });
  }
});

// ─────────────────────────────────────────────
// 📄 PRESCRIPTION UPLOAD — PDF or image → extract text via Groq vision
// ─────────────────────────────────────────────
// Multer error handler middleware (must be defined before the route)
function handleMulterError(err, req, res, next) {
  if (err && err.code === "LIMIT_FILE_SIZE")
    return res.status(400).json({ success: false, error: "File too large. Max size is 10MB." });
  if (err)
    return res.status(400).json({ success: false, error: "File upload error: " + err.message });
  next();
}

// Prescription upload — multer runs first via callback, then auth is checked inside
app.post("/api/prescription/upload", (req, res) => {
  upload.single("file")(req, res, async (multerErr) => {
    if (multerErr) {
      if (multerErr.code === "LIMIT_FILE_SIZE")
        return res.status(400).json({ success: false, error: "File too large. Max 10MB." });
      return res.status(400).json({ success: false, error: "Upload error: " + multerErr.message });
    }

    // Auth check AFTER multer so token issues don't prevent file parsing
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ success: false, error: "Not authenticated" });
    try { jwt.verify(authHeader.split(" ")[1], JWT_SECRET); }
    catch { return res.status(401).json({ success: false, error: "Session expired. Please log in again." }); }

    if (!req.file)
      return res.status(400).json({ success: false, error: "No file received. Please try again." });

    console.log("  📄 Prescription upload:", req.file.originalname, "| type:", req.file.mimetype, "| size:", req.file.size, "bytes");

    try {
      const isImage = req.file.mimetype.startsWith("image/");
      const isPDF   = req.file.mimetype === "application/pdf";
      let extractedText = "";

      if (isImage) {
        const base64    = req.file.buffer.toString("base64");
        const mediaType = req.file.mimetype;
        console.log("  🔍 Sending image to Groq vision...");

        const groqRes = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [{
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
                { type: "text", text: "This is a medical prescription image. Extract ALL information: doctor name, clinic/hospital name, patient name, date, diagnosis, and every medicine listed with its exact dosage, frequency and duration. Present each medicine on a new line. Include any special instructions." }
              ]
            }],
            max_tokens: 1500,
          },
          { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" } }
        );
        extractedText = groqRes.data?.choices?.[0]?.message?.content || "Could not extract text from image.";

      } else if (isPDF) {
        try {
          const pdfParse = require("pdf-parse");
          const pdfData  = await pdfParse(req.file.buffer);
          const rawText  = pdfData.text?.trim();

          if (rawText && rawText.length > 20) {
            console.log("  🔍 PDF text extracted, structuring with Groq...");
            const groqRes = await axios.post(
              "https://api.groq.com/openai/v1/chat/completions",
              {
                model: "llama-3.3-70b-versatile",
                messages: [{
                  role: "user",
                  content: `Structure this raw medical prescription text clearly:

${rawText}

Extract: doctor name, patient name, date, diagnosis if present, and each medicine with its dosage, frequency and duration. Present cleanly.`
                }],
                max_tokens: 1000,
              },
              { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" } }
            );
            extractedText = groqRes.data?.choices?.[0]?.message?.content || rawText;
          } else {
            extractedText = "This PDF appears to be a scanned image. Please photograph your prescription and upload as JPG/PNG for better results.";
          }
        } catch (pdfErr) {
          console.error("  ⚠️  pdf-parse error:", pdfErr.message);
          extractedText = "Could not read PDF text. Please upload a photo (JPG/PNG) of your prescription for best results.";
        }
      }

      console.log("  ✅ Prescription processed, length:", extractedText.length);
      return res.json({ success: true, extractedText, fileName: req.file.originalname });

    } catch (err) {
      console.error("  ❌ Prescription error:", err.response?.data || err.message);
      return res.status(500).json({ success: false, error: "Failed to process file: " + err.message });
    }
  });
});

// ─────────────────────────────────────────────
// 💬 CHAT (AI) — with optional prescription context
// ─────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  try {
    const { messages, prescriptionContext } = req.body;
    if (!messages?.length) return res.status(400).json({ error: "Messages required" });

    const fullText  = messages.map((m) => m.text).join(" ");
    const symptoms  = detectSymptoms(fullText);

    // Log case symptoms for prediction
    if (symptoms.length) {
      await Case.create({ symptoms, location: "India" }).catch(() => {});
    }

    const conversation = messages.map((m) => `${m.role === "user" ? "Patient" : "Doctor"}: ${m.text}`).join("\n");
    const lastMessage  = messages[messages.length - 1].text;

    if (isSevere(lastMessage))
      return res.json({ reply: "⚠️ This sounds serious. Please seek immediate medical attention or call emergency services.", symptoms });

    // Handle "no prescription" response
    const noPrescription = /^(no|none|nope|i don'?t have|don'?t have|na|n\/a)$/i.test(lastMessage.trim());

    let prompt = "";
    const missingInfo = getMissingInfo(fullText);

    // Build prescription context block if available
    const prescriptionBlock = prescriptionContext
      ? `\n\nPATIENT'S PREVIOUS PRESCRIPTION:\n${prescriptionContext}\n`
      : "";

    if (noPrescription && messages.length <= 4) {
      prompt = `You are a professional doctor. The patient says they have no previous prescription.
${prescriptionBlock}
Conversation:
${conversation}

Ask ONE follow-up question about their symptoms to gather more information. Be concise and professional.`;

    } else if (isCrossQuestion(lastMessage)) {
      prompt = `You are a professional doctor.
${prescriptionBlock}
Conversation:
${conversation}

Medical knowledge: ${searchMedical(fullText)}

Answer the patient's question clearly and professionally. Do NOT prescribe specific medicines. Reference the prescription if relevant.`;

    } else if (missingInfo.length > 0 && messages.length < 8) {
      prompt = `You are a doctor in a clinical consultation.
${prescriptionBlock}
Conversation:
${conversation}

Missing information: ${missingInfo.join(", ")}

Ask ONE most important missing question. Be natural and concise.`;

    } else {
      prompt = `You are a highly experienced doctor providing a clinical assessment.
${prescriptionBlock}
Medical knowledge: ${searchMedical(fullText)}

Conversation:
${conversation}

${prescriptionContext ? "Use the patient's prescription history to inform your assessment." : ""}

Provide a professional assessment in this format:

Summary:
Likely Causes:
${prescriptionContext ? "Prescription Analysis:\n" : ""}Severity Level:
Recommended Actions:
Red Flags to Watch:

Do NOT prescribe specific medicines. Recommend consulting a doctor for prescriptions.`;
    }

    const groqResponse = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      { model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }] },
      { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" } }
    );

    const reply = groqResponse.data?.choices?.[0]?.message?.content || "No response generated.";
    return res.json({ reply, symptoms });

  } catch (error) {
    console.error("  ❌ Chat error:", error.response?.data || error.message);
    return res.json({ reply: "AI is temporarily unavailable. Please try again.", symptoms: [] });
  }
});

// ─────────────────────────────────────────────
// 📋 PATIENT RECORDS — save / get / delete
// ─────────────────────────────────────────────
app.post("/api/records", authMiddleware, async (req, res) => {
  try {
    const { messages, aiSummary, symptoms } = req.body;
    if (!messages?.length) return res.status(400).json({ success: false, error: "Messages required" });

    const user = await User.findById(req.user.id).select("name city state diseases");
    const location = user?.city ? `${user.city}${user.state ? ", " + user.state : ""}` : "Unknown";
    const detectedSymptoms = symptoms?.length ? symptoms : detectSymptoms(messages.map((m) => m.text).join(" "));

    const record = await PatientRecord.create({
      userId:    req.user.id,
      name:      user?.name || "Unknown",
      location,
      symptoms:  detectedSymptoms,
      diseases:  user?.diseases || null,
      aiSummary: aiSummary || "",
      messages,
    });

    console.log("  ✅ Record saved | name:", record.name, "| location:", record.location, "| symptoms:", detectedSymptoms);

    // Check for outbreak in this area
    await checkAndTriggerAlerts(location, detectedSymptoms);

    return res.status(201).json({ success: true, record });
  } catch (err) {
    console.error("  ❌ Save record error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to save: " + err.message });
  }
});

app.get("/api/records", authMiddleware, async (req, res) => {
  try {
    const records = await PatientRecord.find({ userId: req.user.id }).sort({ createdAt: -1 });
    console.log("  📋 Fetched", records.length, "records for:", req.user.email);
    return res.json({ success: true, records });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch records" });
  }
});

app.delete("/api/records/:id", authMiddleware, async (req, res) => {
  try {
    await PatientRecord.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    console.log("  🗑️  Record deleted:", req.params.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to delete" });
  }
});

// ─────────────────────────────────────────────
// 🚨 ALERTS — get active alerts for user's area
// ─────────────────────────────────────────────
app.get("/api/alerts", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("city state");
    const city = user?.city || "";

    // Get alerts for user's city OR general alerts
    const query = city
      ? { isActive: true, $or: [{ area: { $regex: city, $options: "i" } }, { area: "All" }] }
      : { isActive: true };

    const alerts = await Alert.find(query).sort({ triggeredAt: -1 }).limit(10);
    return res.json({ success: true, alerts, userCity: city });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to fetch alerts" });
  }
});

// ─────────────────────────────────────────────
// 📊 PREDICTION — area-level symptom trends
// ─────────────────────────────────────────────
app.get("/api/prediction", async (req, res) => {
  try {
    const { city } = req.query;   // optional: filter by city
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const matchStage = { createdAt: { $gte: since } };
    if (city) matchStage.location = { $regex: city, $options: "i" };

    // Aggregate symptom frequency
    const pipeline = [
      { $match: matchStage },
      { $unwind: "$symptoms" },
      { $group: { _id: "$symptoms", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ];
    const symptomAgg = await PatientRecord.aggregate(pipeline);
    const symptomFrequency = symptomAgg.map(({ _id, count }) => ({ symptom: _id, count }));

    // Area breakdown
    const areaPipeline = [
      { $match: matchStage },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ];
    const areaAgg = await PatientRecord.aggregate(areaPipeline);
    const areaBreakdown = areaAgg.map(({ _id, count }) => ({ area: _id || "Unknown", count }));

    const totalCases = await PatientRecord.countDocuments(matchStage);

    // Active alerts
    const activeAlerts = await Alert.find({ isActive: true }).sort({ triggeredAt: -1 }).limit(5);

    // AI prediction summary
    let prediction = null;
    if (symptomFrequency.length > 0) {
      const topSymptoms = symptomFrequency.slice(0, 5).map((s) => `${s.symptom} (${s.count} cases)`).join(", ");
      const areaInfo    = city ? `in ${city}` : "across all areas";
      const prompt = `Based on recent patient records ${areaInfo} showing these symptoms: ${topSymptoms}

Respond ONLY with valid JSON (no markdown, no explanation):
{"topConditions":["condition1","condition2","condition3"],"riskLevel":"Low","advisory":"2-3 sentence public health advisory","preventionTips":["tip1","tip2","tip3"]}`;
      try {
        const groqRes = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          { model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }] },
          { headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" } }
        );
        prediction = JSON.parse(groqRes.data.choices[0].message.content.replace(/```json|```/g, "").trim());
      } catch (e) { console.error("  ⚠️  Groq prediction error:", e.message); }
    }

    return res.json({
      success: true, totalCases, symptomFrequency, areaBreakdown, activeAlerts,
      prediction: prediction || {
        topConditions: ["Insufficient data"], riskLevel: "Low",
        advisory: "Not enough data yet. Stay hydrated and maintain hygiene.",
        preventionTips: ["Wash hands regularly", "Stay hydrated", "Rest if unwell"],
      },
    });
  } catch (err) {
    console.error("  ❌ Prediction error:", err.message);
    return res.status(500).json({ success: false, error: "Failed: " + err.message });
  }
});

// ─────────────────────────────────────────────
// 🚀 START
// ─────────────────────────────────────────────
app.listen(3001, () => {
  console.log("\n========================================");
  console.log("  🚀 Backend → http://localhost:3001");
  console.log("  📦 MongoDB:", process.env.MONGODB_URI?.includes("atlas") ? "Atlas ☁️" : "Local 🖥️");
  console.log("  🔑 JWT:", JWT_SECRET ? "SET ✅" : "MISSING ❌");
  console.log("  🤖 Groq:", process.env.GROQ_API_KEY ? "SET ✅" : "MISSING ❌");
  console.log("========================================\n");
});

// ─────────────────────────────────────────────
// 📍 LOCATION ROUTES
// ─────────────────────────────────────────────

// Reverse geocode lat/lng → city + state using free Nominatim
app.get("/api/location/geocode", async (req, res) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ success: false, error: "lat and lng required" });
    console.log("  📍 Geocoding:", lat, lng);
    const nom = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "UpchaarHealthApp/1.0" }, timeout: 8000 }
    );
    const addr  = nom.data?.address || {};
    const city  = addr.city || addr.town || addr.village || addr.county || "";
    const state = addr.state || "";
    console.log("  ✅ Resolved:", city, state);
    return res.json({ success: true, city, state });
  } catch (err) {
    console.error("  ❌ Geocode error:", err.message);
    return res.status(500).json({ success: false, error: "Could not resolve location" });
  }
});

// Save location to user profile
app.post("/api/location/save", authMiddleware, async (req, res) => {
  try {
    const { city, state } = req.body;
    if (!city) return res.status(400).json({ success: false, error: "city required" });
    const user = await User.findByIdAndUpdate(req.user.id, { $set: { city, state: state || "" } }, { new: true }).select("name city state");
    console.log("  📍 Location saved:", user?.name, "→", city, state);
    return res.json({ success: true, city, state });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to save location" });
  }
});

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { sendChatMessage, saveRecord, uploadPrescription } from "../../services/api";

const symptomsList = ["Fever", "Headache", "Cold", "Cough", "Fatigue", "Body Pain"];
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSupported = !!SpeechRecognition;

function ChatSection() {
  const { user } = useAuth();

  const [messages,    setMessages]    = useState([{ role: "assistant", text: "Hi 👋 Tell me your symptoms or select one below. You can also upload a past prescription using the 📎 button." }]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [listening,   setListening]   = useState(false);
  const [voiceError,  setVoiceError]  = useState("");

  // Prescription state
  const [prescription,     setPrescription]     = useState(null);   // extracted text
  const [prescFileName,    setPrescFileName]    = useState("");
  const [uploadingPresc,   setUploadingPresc]   = useState(false);
  const [uploadError,      setUploadError]      = useState("");

  const bottomRef      = useRef();
  const fileInputRef   = useRef();
  const recognitionRef = useRef(null);
  const allSymptoms    = useRef([]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ── Voice ───────────────────────────────────
  const startListening = () => {
    if (!speechSupported) { setVoiceError("Voice not supported. Use Chrome."); return; }
    setVoiceError("");
    const rec = new SpeechRecognition();
    rec.lang = "en-IN"; rec.interimResults = true; rec.continuous = false;
    recognitionRef.current = rec;
    rec.onstart  = () => setListening(true);
    rec.onend    = () => setListening(false);
    rec.onerror  = (e) => { setListening(false); setVoiceError(e.error === "not-allowed" ? "Mic permission denied." : `Error: ${e.error}`); };
    rec.onresult = (e) => setInput(Array.from(e.results).map((r) => r[0].transcript).join(""));
    rec.start();
  };
  const stopListening = () => { recognitionRef.current?.stop(); setListening(false); };

  // ── Prescription upload ─────────────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPresc(true);
    setUploadError("");
    setPrescription(null);
    setPrescFileName(file.name);

    const res = await uploadPrescription(file);
    setUploadingPresc(false);

    if (res.success) {
      setPrescription(res.extractedText);
      // Inject a system message into chat so user sees it was uploaded
      setMessages((prev) => [...prev, {
        role: "assistant",
        text: `📄 Prescription uploaded: **${file.name}**\n\n${res.extractedText.length > 300 ? res.extractedText.slice(0, 300) + "…" : res.extractedText}\n\nI'll use this to give you a more accurate assessment. Please describe your current symptoms.`,
      }]);
    } else {
      setUploadError(res.error || "Upload failed.");
      setPrescFileName("");
    }
    e.target.value = "";   // reset input
  };

  const clearPrescription = () => {
    setPrescription(null);
    setPrescFileName("");
    setUploadError("");
  };

  // ── Send message ────────────────────────────
  const sendMessage = async (text) => {
    const trimmed = text?.trim();
    if (!trimmed || loading) return;
    setInput("");
    if (listening) stopListening();

    const newMessages = [...messages, { role: "user", text: trimmed }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const data  = await sendChatMessage(newMessages, prescription || null);
      const reply = data.reply || "No response.";

      if (data.symptoms?.length)
        allSymptoms.current = [...new Set([...allSymptoms.current, ...data.symptoms])];

      const finalMessages = [...newMessages, { role: "assistant", text: reply }];
      setMessages(finalMessages);

      if (user?.id && !saved) {
        await saveRecord({ messages: finalMessages, aiSummary: reply, symptoms: allSymptoms.current });
        setSaved(true);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Server error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([{ role: "assistant", text: "Hi 👋 Tell me your symptoms or select one below. You can also upload a past prescription using the 📎 button." }]);
    setSaved(false); setInput(""); setVoiceError("");
    setPrescription(null); setPrescFileName(""); setUploadError("");
    allSymptoms.current = [];
  };

  const handleKeyDown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } };

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Chat Assistant</h2>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 px-2.5 py-1 rounded-full">
              ✅ Saved to records
            </span>
          )}
          <button onClick={handleNewChat}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition">
            + New Chat
          </button>
        </div>
      </div>

      {/* ── Prescription badge ── */}
      {prescFileName && (
        <div className={`mb-2 shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs border ${
          uploadingPresc
            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-400"
            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400"
        }`}>
          <span>📄</span>
          <span className="flex-1 truncate">{uploadingPresc ? "Reading prescription…" : prescFileName}</span>
          {!uploadingPresc && (
            <button onClick={clearPrescription} className="ml-1 text-gray-400 hover:text-red-500 transition">✕</button>
          )}
        </div>
      )}
      {uploadError && <p className="mb-2 text-xs text-red-500 shrink-0">⚠️ {uploadError}</p>}

      {/* ── Symptom chips ── */}
      <div className="flex flex-wrap gap-2 mb-3 shrink-0">
        {symptomsList.map((s, i) => (
          <button key={i} onClick={() => sendMessage(s)} disabled={loading}
            className="px-4 py-1.5 rounded-full bg-primary text-white text-sm hover:opacity-90 transition disabled:opacity-50">
            {s}
          </button>
        ))}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3 border dark:border-gray-700">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[78%] whitespace-pre-wrap leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-white rounded-br-sm"
                : "bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-100 dark:border-gray-600 rounded-bl-sm"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-bl-sm">
              <span className="flex gap-1 items-center">
                {[0, 150, 300].map((d, i) => (
                  <span key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {voiceError && <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 shrink-0">{voiceError}</p>}

      {/* ── Input bar ── */}
      <div className="mt-3 shrink-0">
        {listening && (
          <div className="flex items-center gap-2 mb-2 text-sm text-red-500 animate-pulse">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
            Listening… speak now
          </div>
        )}

        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" />

          {/* Attachment button */}
          <button onClick={() => fileInputRef.current?.click()} disabled={loading || uploadingPresc}
            title="Upload prescription (PDF or image)"
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          {/* Text input */}
          <input type="text" placeholder={listening ? "Listening…" : "Describe your symptoms or type 'no' if no prescription…"}
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} disabled={loading}
            className="flex-1 px-2 py-1.5 bg-transparent outline-none text-sm text-gray-800 dark:text-white placeholder-gray-400" />

          {/* Mic button */}
          {speechSupported && (
            <button onClick={listening ? stopListening : startListening} disabled={loading}
              title={listening ? "Stop" : "Voice input"}
              className={`p-2 rounded-lg transition disabled:opacity-50 shrink-0 ${
                listening ? "bg-red-500 text-white animate-pulse hover:bg-red-600" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}>
              {listening
                ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              }
            </button>
          )}

          {/* Send button */}
          <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
            className="px-5 py-2 bg-primary text-white text-sm rounded-lg hover:opacity-90 transition disabled:opacity-50 font-medium shrink-0">
            Send
          </button>
        </div>

        <p className="mt-1.5 text-xs text-gray-400 text-center">
          📎 Upload prescription · 🎙️ Voice input · ⌨️ Type symptoms
        </p>
      </div>
    </div>
  );
}

export default ChatSection;

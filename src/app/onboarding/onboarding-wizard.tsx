"use client";

/**
 * FILE: src/app/onboarding/onboarding-wizard.tsx
 *
 * Step-by-step onboarding wizard. Three steps:
 * 1. Upload profile picture
 * 2. Face scan (for photo matching)
 * 3. Add phone number
 * Then a "You're all set!" screen with celebration animation.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  userId?: string;
  userName: string;
  existingAvatar: string | null;
  existingPhone: string | null;
  existingFaceScan: boolean;
};

// ─── Confetti particle for the celebration screen ───────────────────────
function CelebrationScreen({ userName }: { userName: string }) {
  const [particles, setParticles] = useState<
    { id: number; x: number; delay: number; color: string; size: number }[]
  >([]);

  useEffect(() => {
    const colors = [
      "#f59e0b", "#f97316", "#ef4444", "#8b5cf6",
      "#06b6d4", "#22c55e", "#ec4899", "#eab308",
    ];
    const p = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    }));
    setParticles(p);
  }, []);

  return (
    <div className="relative text-center py-12 overflow-hidden">
      {/* Confetti particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            animationDelay: `${p.delay}s`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}

      <div className="relative z-10">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-bounce-slow">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2">
          You&apos;re all set!
        </h2>
        <p className="text-white/50 text-sm mb-2">
          Welcome to USC, {userName.split(" ")[0]}. Let&apos;s play.
        </p>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall 3s ease-in forwards;
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ─── Main Wizard ────────────────────────────────────────────────────────
export default function OnboardingWizard({
  userName,
  existingAvatar,
  existingPhone,
  existingFaceScan,
}: Props) {
  const router = useRouter();

  // Determine starting step based on what's already done
  const getInitialStep = () => {
    if (!existingAvatar) return 1;
    if (!existingFaceScan) return 2;
    if (!existingPhone) return 3;
    return 4; // all done
  };

  const [step, setStep] = useState(getInitialStep);

  // Step 1 state: Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(existingAvatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(existingAvatar);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Step 2 state: Face scan
  const [, setFaceScanDone] = useState(existingFaceScan);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [scanError, setScanError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Step 3 state: Phone
  const [phone, setPhone] = useState(existingPhone ?? "");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [, setPhoneSaved] = useState(!!existingPhone);

  // Step 4 state: Complete
  const [completing, setCompleting] = useState(false);

  // ─── Step 1: Avatar upload ────────────────────────────────────────────

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError("");
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function uploadAvatar() {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    setAvatarError("");

    try {
      const formData = new FormData();
      formData.append("image", avatarFile);

      const res = await fetch("/api/settings/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setAvatarError(data.error || "Upload failed");
        setUploadingAvatar(false);
        return;
      }

      setAvatarUrl(data.url);
      setUploadingAvatar(false);
      setStep(2);
    } catch {
      setAvatarError("Upload failed. Check your connection.");
      setUploadingAvatar(false);
    }
  }

  // ─── Step 2: Face scan ────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  async function startCamera() {
    setScanError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setScanError("Camera access denied. Please allow camera access and try again.");
    }
  }

  async function captureAndScan() {
    if (!videoRef.current) return;
    setScanning(true);
    setScanStatus("Loading face detection...");
    setScanError("");

    try {
      const faceapi = await import("face-api.js");

      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

      setScanStatus("Detecting your face...");

      // Capture frame from video
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(videoRef.current, 0, 0);

      const detection = await faceapi
        .detectSingleFace(canvas)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setScanError("No face detected. Make sure your face is clearly visible and well-lit.");
        setScanning(false);
        return;
      }

      setScanStatus("Saving face data...");

      // Save the descriptor to the profile
      const descriptor = Array.from(detection.descriptor);

      const res = await fetch("/api/onboarding/face-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descriptor }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScanError(data.error || "Could not save face scan");
        setScanning(false);
        return;
      }

      // Done
      stopCamera();
      setFaceScanDone(true);
      setScanning(false);
      setScanStatus("");
      setStep(3);
    } catch (err) {
      console.error("Face scan error:", err);
      setScanError("Face scan failed. Try again.");
      setScanning(false);
    }
  }

  function skipFaceScan() {
    stopCamera();
    setStep(3);
  }

  // ─── Step 3: Phone ───────────────────────────────────────────────────

  async function savePhone() {
    setPhoneError("");
    const cleaned = phone.replace(/\s+/g, "").replace(/^\+91/, "");

    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      setPhoneError("Enter a valid 10-digit Indian mobile number");
      return;
    }

    setSavingPhone(true);

    try {
      const res = await fetch("/api/settings/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cleaned }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPhoneError(data.error || "Could not save phone number");
        setSavingPhone(false);
        return;
      }

      setPhoneSaved(true);
      setSavingPhone(false);

      // Complete onboarding
      await completeOnboarding();
    } catch {
      setPhoneError("Failed to save. Check your connection.");
      setSavingPhone(false);
    }
  }

  // ─── Complete ─────────────────────────────────────────────────────────

  async function completeOnboarding() {
    setCompleting(true);

    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        console.error("Onboarding complete error:", data.error);
      }

      setStep(4);

      // Redirect to dashboard after a short celebration
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      // Still go to step 4 and redirect
      setStep(4);
      setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
    } finally {
      setCompleting(false);
    }
  }

  // ─── Progress bar ─────────────────────────────────────────────────────

  const totalSteps = 3;
  const currentProgress = Math.min(step, totalSteps);

  return (
    <div className="max-w-lg mx-auto px-6 py-14">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
          <span className="text-white font-black text-sm">U</span>
        </div>
        {step < 4 && (
          <>
            <h1 className="text-2xl font-extrabold text-white mb-1">
              Set up your profile
            </h1>
            <p className="text-white/40 text-sm">
              Just {totalSteps} quick steps to get started
            </p>
          </>
        )}
      </div>

      {/* Progress bar */}
      {step < 4 && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                  s < step
                    ? "bg-amber-400 text-white"
                    : s === step
                    ? "bg-amber-400/20 text-amber-400 border-2 border-amber-400"
                    : "bg-white/5 text-white/30 border border-white/10"
                }`}
              >
                {s < step ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
            ))}
          </div>
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 rounded-full"
              style={{ width: `${((currentProgress - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── STEP 1: Profile Picture ─────────────────────────────────── */}
      {step === 1 && (
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-1">
            Upload your profile picture
          </h2>
          <p className="text-white/40 text-sm mb-6">
            This is how other players will recognize you
          </p>

          {/* Preview */}
          <div className="flex justify-center mb-6">
            {avatarPreview ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPreview}
                  alt="Preview"
                  className="w-32 h-32 rounded-full object-cover border-4 border-amber-400/30"
                />
                <button
                  onClick={() => {
                    setAvatarPreview(null);
                    setAvatarFile(null);
                    setAvatarUrl(null);
                  }}
                  className="absolute -top-1 -right-1 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white text-xs hover:bg-red-400"
                >
                  X
                </button>
              </div>
            ) : (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="w-32 h-32 rounded-full border-2 border-dashed border-white/20 hover:border-amber-400/50 flex flex-col items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-xs text-white/30">Add photo</span>
              </button>
            )}
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />

          {avatarPreview && !avatarUrl && (
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="w-full text-center text-xs text-amber-400 hover:text-amber-300 mb-4"
            >
              Choose a different photo
            </button>
          )}

          {avatarError && (
            <p className="text-red-400 text-sm text-center mb-4">{avatarError}</p>
          )}

          <button
            onClick={avatarFile ? uploadAvatar : () => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
              avatarFile
                ? "bg-amber-400 hover:bg-amber-300 text-black"
                : "bg-white/5 hover:bg-white/10 text-white/50"
            } disabled:opacity-50`}
          >
            {uploadingAvatar
              ? "Uploading..."
              : avatarFile
              ? "Upload & Continue"
              : "Choose a Photo"}
          </button>
        </div>
      )}

      {/* ─── STEP 2: Face Scan ───────────────────────────────────────── */}
      {step === 2 && (
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-1">
            Scan your face
          </h2>
          <p className="text-white/40 text-sm mb-6">
            This lets you find yourself in event photos automatically. Take a clear selfie.
          </p>

          {/* Camera view */}
          <div className="flex justify-center mb-6">
            <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-black/50 border border-white/10">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                style={{ display: cameraActive ? "block" : "none" }}
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                  <span className="text-xs text-white/30">Camera preview</span>
                </div>
              )}

              {/* Scanning overlay */}
              {scanning && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs text-amber-400">{scanStatus}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {scanError && (
            <p className="text-red-400 text-sm text-center mb-4">{scanError}</p>
          )}

          <div className="space-y-3">
            {!cameraActive ? (
              <button
                onClick={startCamera}
                className="w-full py-3 rounded-xl font-bold text-sm bg-amber-400 hover:bg-amber-300 text-black transition-all"
              >
                Open Camera
              </button>
            ) : (
              <button
                onClick={captureAndScan}
                disabled={scanning}
                className="w-full py-3 rounded-xl font-bold text-sm bg-amber-400 hover:bg-amber-300 text-black transition-all disabled:opacity-50"
              >
                {scanning ? "Scanning..." : "Capture & Scan"}
              </button>
            )}

            <button
              onClick={skipFaceScan}
              className="w-full py-3 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 text-white/40 transition-all"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Phone Number ────────────────────────────────────── */}
      {step === 3 && (
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-1">
            Add your phone number
          </h2>
          <p className="text-white/40 text-sm mb-6">
            We&apos;ll send you event reminders on WhatsApp
          </p>

          <div className="mb-6">
            <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
              Mobile number
            </label>
            <div className="flex items-center gap-2">
              <span className="text-white/50 text-sm font-mono bg-white/5 border border-white/10 rounded-lg px-3 py-2.5">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10));
                  setPhoneError("");
                }}
                placeholder="9876543210"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-mono placeholder:text-white/20 focus:outline-none focus:border-amber-400/50 transition-colors"
                maxLength={10}
              />
            </div>
          </div>

          {phoneError && (
            <p className="text-red-400 text-sm mb-4">{phoneError}</p>
          )}

          <button
            onClick={savePhone}
            disabled={savingPhone || completing || phone.length < 10}
            className="w-full py-3 rounded-xl font-bold text-sm bg-amber-400 hover:bg-amber-300 text-black transition-all disabled:opacity-50"
          >
            {completing
              ? "Setting up your profile..."
              : savingPhone
              ? "Saving..."
              : "Finish Setup"}
          </button>
        </div>
      )}

      {/* ─── STEP 4: Celebration ─────────────────────────────────────── */}
      {step === 4 && <CelebrationScreen userName={userName} />}
    </div>
  );
}

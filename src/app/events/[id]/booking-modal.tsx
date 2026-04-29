"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const MAX_SPOTS = 4;

type Props = {
  eventId:    string;
  eventTitle: string;
  date:       string;
  time:       string;
  location:   string;
  spotsLeft:  number;
  isFree:     boolean;
  perPerson:  number;
  upiId:      string | null;
  upiQrUrl:   string | null;
  userId:     string | null;
  userName:   string;
  userEmail:  string;
  userPhone:  string;
};

export default function BookingModal({
  eventId, eventTitle, date, time, location,
  spotsLeft, isFree, perPerson, upiId, upiQrUrl,
  userId, userName, userEmail, userPhone,
}: Props) {
  const router  = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);

  const isLoggedIn = !!userId;

  // Player name fields — index 0 is always the logged-in user
  const [playerNames, setPlayerNames] = useState<string[]>([userName]);
  const [phone,  setPhone]  = useState(userPhone);
  const [email,  setEmail]  = useState(userEmail);
  const [spots,  setSpots]  = useState(1);

  const maxAllowed = Math.min(spotsLeft, MAX_SPOTS);
  const total = perPerson * spots;

  // Resize playerNames array when spots changes
  useEffect(() => {
    setPlayerNames(prev => {
      const next = [...prev];
      while (next.length < spots) next.push("");
      while (next.length > spots) next.pop();
      return next;
    });
  }, [spots]);

  function openModal() {
    // Not logged in — go to login page
    if (!isLoggedIn) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }
    setPlayerNames([userName]);
    setPhone(userPhone);
    setEmail(userEmail);
    setSpots(1);
    setOpen(true);
  }

  function closeModal() { if (!loading) setOpen(false); }

  async function handleConfirm() {
    if (!playerNames[0]?.trim()) return alert("Please enter your name.");
    if (!email.trim())           return alert("Please enter your email.");
    for (let i = 1; i < spots; i++) {
      if (!playerNames[i]?.trim()) return alert(`Please enter the name for Player ${i + 1}.`);
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/book`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ playerNames, email: email.trim(), spots, isFree, perPerson }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Something went wrong."); setLoading(false); return; }
      setOpen(false);
      router.refresh();
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyUpi() {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openModal}
        className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm py-4 rounded-xl transition-colors"
      >
        {!isLoggedIn
          ? "Login & Pay →"
          : isFree
            ? "Join Event →"
            : `Book Now — ₹${perPerson}/person →`}
      </button>

      {!isLoggedIn && (
        <p className="text-center text-xs text-white/40 mt-2">Login required to book a spot.</p>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />

          <div
            className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-[#0a0f1e] border border-white/10 rounded-t-3xl sm:rounded-2xl"
            style={{ animation: "slideUp 0.3s ease-out" }}
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="p-6 space-y-5">
              {/* Header */}
              <div>
                <h2 className="text-lg font-extrabold text-white leading-snug">{eventTitle}</h2>
                <p className="text-sm text-white/40 mt-1">{date} · {time} · {location}</p>
              </div>

              <div className="border-t border-white/5" />

              {/* Player 1 — always the logged-in user */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Your Name</label>
                  <input
                    type="text"
                    value={playerNames[0] ?? ""}
                    onChange={e => setPlayerNames(prev => { const n=[...prev]; n[0]=e.target.value; return n; })}
                    placeholder="Your full name"
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Spots counter */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Number of Spots</label>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setSpots(Math.max(1, spots - 1))}
                    disabled={spots <= 1}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >−</button>
                  <span className="text-xl font-extrabold text-white tabular-nums w-8 text-center">{spots}</span>
                  <button
                    type="button"
                    onClick={() => setSpots(Math.min(maxAllowed, spots + 1))}
                    disabled={spots >= maxAllowed}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors"
                  >+</button>
                  <span className="text-xs text-white/40 ml-auto">{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
                </div>
                {maxAllowed < spotsLeft && (
                  <p className="text-[11px] text-white/30 mt-1">Max {MAX_SPOTS} spots per booking</p>
                )}
              </div>

              {/* Extra player name fields for spots 2–4 */}
              {spots > 1 && (
                <div className="space-y-3">
                  <div className="border-t border-white/5" />
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Other Players</p>
                  {Array.from({ length: spots - 1 }, (_, i) => (
                    <div key={i + 1}>
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Player {i + 2} Name
                      </label>
                      <input
                        type="text"
                        value={playerNames[i + 1] ?? ""}
                        onChange={e => setPlayerNames(prev => { const n=[...prev]; n[i+1]=e.target.value; return n; })}
                        placeholder={`Player ${i + 2} full name`}
                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Price breakdown for paid events */}
              {!isFree && (
                <>
                  <div className="border-t border-white/5" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Spot price</span>
                      <span className="text-white/70">₹{perPerson}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Qty</span>
                      <span className="text-white/70">× {spots}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-lg font-extrabold text-amber-400">₹{total}</span>
                    </div>
                  </div>

                  {/* UPI payment info */}
                  {(upiQrUrl || upiId) && (
                    <>
                      <div className="border-t border-white/5" />
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Pay via UPI</p>
                        {upiQrUrl && (
                          <div className="flex justify-center">
                            <img
                              src={upiQrUrl}
                              alt="UPI QR Code"
                              className="w-40 h-40 rounded-xl border border-white/10 object-contain bg-white p-1"
                            />
                          </div>
                        )}
                        {upiId && (
                          <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                            <p className="text-sm font-mono text-white/70">{upiId}</p>
                            <button
                              type="button"
                              onClick={copyUpi}
                              className="text-xs text-amber-400 hover:text-amber-300 transition-colors ml-2 flex-shrink-0 font-bold"
                            >
                              {copied ? "Copied!" : "Copy UPI ID"}
                            </button>
                          </div>
                        )}
                        <p className="text-[11px] text-white/30">Pay the host directly, then confirm your spot below.</p>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-bold text-sm py-4 rounded-xl transition-colors"
              >
                {loading
                  ? "Booking..."
                  : isFree
                    ? "Confirm Booking →"
                    : `Login & Pay ₹${total} →`}
              </button>

              <button
                onClick={closeModal}
                disabled={loading}
                className="w-full text-center text-sm text-white/50 hover:text-white/60 transition-colors py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

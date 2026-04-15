/**
 * FILE: src/app/events/[id]/booking-modal.tsx
 *
 * Professional booking/RSVP modal that slides up from the bottom on mobile.
 * Shows event details, contact fields, spot selector, price breakdown,
 * and payment method picker (for paid events).
 *
 * Supports two modes:
 *  - Logged-in user: pre-fills name/phone/email, submits via Supabase client
 *  - Guest (no account): shows empty form, submits via /api/events/[id]/guest-rsvp
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  eventId: string;
  eventTitle: string;
  date: string;       // pre-formatted
  time: string;       // pre-formatted
  location: string;
  spotsLeft: number;
  isFree: boolean;
  perPerson: number;
  upiId: string | null;
  userId: string | null;
  userName: string;
  userEmail: string;
  userPhone: string;
};

type PaymentMethod = "upi" | "card" | "netbanking" | "pay_at_spot";

export default function BookingModal({
  eventId,
  eventTitle,
  date,
  time,
  location,
  spotsLeft,
  isFree,
  perPerson,
  upiId,
  userId,
  userName,
  userEmail,
  userPhone,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isGuest = !userId;

  // Form state
  const [name, setName] = useState(userName);
  const [phone, setPhone] = useState(userPhone);
  const [email, setEmail] = useState(userEmail);
  const [spots, setSpots] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");

  const total = perPerson * spots;
  const platformFee = 0; // UPI = 0% fee

  function openModal() {
    // Reset form to current values each time
    setName(userName);
    setPhone(userPhone);
    setEmail(userEmail);
    setSpots(1);
    setPaymentMethod("upi");
    setOpen(true);
  }

  function closeModal() {
    if (!loading) setOpen(false);
  }

  async function handleConfirm() {
    if (!name.trim()) return alert("Please enter your name.");
    if (!phone.trim()) return alert("Please enter your phone number.");
    if (!email.trim()) return alert("Please enter your email.");

    // Phone validation for guests (10-digit Indian number)
    if (isGuest) {
      const cleanPhone = phone.replace(/[\s\-\+]/g, "");
      const phoneDigits = cleanPhone.replace(/^(91|0)/, "");
      if (!/^\d{10}$/.test(phoneDigits)) {
        return alert("Please enter a valid 10-digit phone number.");
      }
    }

    setLoading(true);

    try {
      if (isGuest) {
        // Guest booking — call the guest RSVP API
        const res = await fetch(`/api/events/${eventId}/guest-rsvp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userName: name.trim(),
            userEmail: email.trim(),
            userPhone: phone.trim(),
            spots,
            paymentMethod: isFree ? undefined : paymentMethod,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Something went wrong. Please try again.");
          setLoading(false);
          return;
        }
      } else {
        // Logged-in user — insert via Supabase client
        const supabase = createClient();

        for (let i = 0; i < spots; i++) {
          await supabase.from("rsvps").insert({
            event_id:       eventId,
            user_id:        userId,
            user_name:      name.trim(),
            user_email:     email.trim(),
            payment_status: isFree ? "free" : "pending",
          });
        }
      }

      // For paid events with UPI selected (not pay_at_spot) — open UPI deep link
      if (!isFree && paymentMethod === "upi" && upiId) {
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name.trim())}&am=${total}&cu=INR&tn=${encodeURIComponent("USC Event Booking")}`;
        window.location.href = upiUrl;
      }

      setOpen(false);
      router.refresh();
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openModal}
        className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm py-4 rounded-xl transition-colors"
      >
        {isFree ? "Join Event" : `Book Now — ₹${perPerson}/person`} →
      </button>

      {/* "No account needed" hint for guests */}
      {isGuest && (
        <p className="text-center text-xs text-white/40 mt-2">
          No account needed. Book any event as a guest.
        </p>
      )}

      {/* Backdrop + Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal sheet */}
          <div
            className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-[#0a0f1e] border border-white/10 rounded-t-3xl sm:rounded-2xl"
            style={{ animation: "slideUp 0.3s ease-out" }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="p-6 space-y-5">
              {/* ── Event header ─────────────────────────────────── */}
              <div>
                <h2 className="text-lg font-extrabold text-white leading-snug">
                  {eventTitle}
                </h2>
                <p className="text-sm text-white/40 mt-1">
                  {date} · {time} · {location}
                </p>
                {isGuest && (
                  <p className="text-xs text-amber-400/70 mt-2">
                    Booking as guest — no account required
                  </p>
                )}
              </div>

              <div className="border-t border-white/5" />

              {/* ── Contact fields ───────────────────────────────── */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Phone {isGuest && <span className="text-amber-400">*</span>}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Email {isGuest && <span className="text-amber-400">*</span>}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* ── Number of spots ──────────────────────────────── */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Number of Spots
                </label>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setSpots(Math.max(1, spots - 1))}
                    disabled={spots <= 1}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <span className="text-xl font-extrabold text-white tabular-nums w-8 text-center">
                    {spots}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSpots(Math.min(spotsLeft, spots + 1))}
                    disabled={spots >= spotsLeft}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                  <span className="text-xs text-white/40 ml-auto">
                    {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                  </span>
                </div>
              </div>

              {/* ── Price breakdown (paid events only) ──────────── */}
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
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Platform fee {paymentMethod === "upi" ? "(0% UPI)" : ""}</span>
                      <span className="text-green-400">₹{platformFee}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-lg font-extrabold text-amber-400">₹{total}</span>
                    </div>
                  </div>
                </>
              )}

              {/* ── Payment method (paid events only) ───────────── */}
              {!isFree && (
                <>
                  <div className="border-t border-white/5" />

                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(
                        [
                          { key: "upi", label: "UPI", sub: "0% fee", disabled: false },
                          { key: "card", label: "Card", sub: "coming soon", disabled: true },
                          { key: "netbanking", label: "Net Banking", sub: "coming soon", disabled: true },
                          { key: "pay_at_spot", label: "Pay at Spot", sub: "cash / any method", disabled: false },
                        ] as const
                      ).map(({ key, label, sub, disabled }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setPaymentMethod(key)}
                          disabled={disabled}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            paymentMethod === key
                              ? "bg-amber-400/10 border-amber-400/40 ring-1 ring-amber-400/20"
                              : "bg-white/[0.03] border-white/10 hover:border-white/20"
                          } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          <p className={`text-sm font-bold ${paymentMethod === key ? "text-amber-400" : "text-white/70"}`}>
                            {label}
                          </p>
                          <p className="text-[10px] text-white/50 mt-0.5">{sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* UPI ID display */}
                  {paymentMethod === "upi" && upiId && (
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                      <p className="text-xs text-white/50">Pay to UPI ID</p>
                      <p className="text-sm font-mono font-semibold text-white/70 mt-0.5">{upiId}</p>
                    </div>
                  )}

                  {/* Pay at Spot info */}
                  {paymentMethod === "pay_at_spot" && (
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                      <p className="text-sm text-white/60">
                        Pay the host directly when you arrive. Cash, UPI, or any method.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── Confirm button ──────────────────────────────── */}
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-bold text-sm py-4 rounded-xl transition-colors"
              >
                {loading
                  ? "Confirming..."
                  : isFree
                  ? "Confirm Booking →"
                  : `Confirm Booking — ₹${total} →`}
              </button>

              {/* Cancel link */}
              <button
                onClick={closeModal}
                disabled={loading}
                className="w-full text-center text-sm text-white/50 hover:text-white/50 transition-colors py-1"
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

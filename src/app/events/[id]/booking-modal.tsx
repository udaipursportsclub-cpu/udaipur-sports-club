"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

type Props = {
  eventId: string;
  eventTitle: string;
  date: string;
  time: string;
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

export default function BookingModal({
  eventId, eventTitle, date, time, location,
  spotsLeft, isFree, perPerson,
  userId, userName, userEmail, userPhone,
}: Props) {
  const router  = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);

  const isGuest = !userId;

  const [name,  setName]  = useState(userName);
  const [phone, setPhone] = useState(userPhone);
  const [email, setEmail] = useState(userEmail);
  const [spots, setSpots] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "pay_at_spot">("razorpay");

  const total = perPerson * spots;

  function openModal() {
    setName(userName); setPhone(userPhone); setEmail(userEmail);
    setSpots(1); setPaymentMethod("razorpay");
    setOpen(true);
  }

  function closeModal() { if (!loading) setOpen(false); }

  function loadRazorpay(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script    = document.createElement("script");
      script.src      = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload   = () => resolve(true);
      script.onerror  = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  async function handleFreeBooking() {
    const supabase = createClient();
    for (let i = 0; i < spots; i++) {
      await supabase.from("rsvps").insert({
        event_id:       eventId,
        user_id:        userId,
        user_name:      name.trim(),
        user_email:     email.trim(),
        payment_status: "free",
      });
    }
    setOpen(false);
    router.refresh();
  }

  async function handleGuestBooking() {
    const res  = await fetch(`/api/events/${eventId}/guest-rsvp`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ userName: name.trim(), userEmail: email.trim(), userPhone: phone.trim(), spots, paymentMethod: isFree ? undefined : paymentMethod }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || "Something went wrong."); setLoading(false); return; }
    setOpen(false);
    router.refresh();
  }

  async function handleRazorpay() {
    const loaded = await loadRazorpay();
    if (!loaded) { alert("Could not load payment gateway. Try again."); setLoading(false); return; }

    // Create order on server
    const orderRes  = await fetch("/api/payments/create-order", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amount: total, eventId, eventTitle }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) { alert(orderData.error || "Payment setup failed."); setLoading(false); return; }

    // Open Razorpay checkout
    const rzp = new window.Razorpay({
      key:          orderData.keyId,
      amount:       total * 100,
      currency:     "INR",
      name:         "Udaipur Sports Club",
      description:  eventTitle,
      order_id:     orderData.orderId,
      prefill:      { name: name.trim(), email: email.trim(), contact: phone.trim() },
      theme:        { color: "#f59e0b" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        // Verify payment + create RSVP
        const verifyRes = await fetch("/api/payments/verify", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            eventId,
            userName:  name.trim(),
            userEmail: email.trim(),
            spots,
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) { alert(verifyData.error || "Payment verification failed."); setLoading(false); return; }
        setOpen(false);
        router.refresh();
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    });
    rzp.open();
  }

  async function handlePayAtSpot() {
    const supabase = createClient();
    for (let i = 0; i < spots; i++) {
      await supabase.from("rsvps").insert({
        event_id:       eventId,
        user_id:        userId,
        user_name:      name.trim(),
        user_email:     email.trim(),
        payment_status: "pending",
      });
    }
    setOpen(false);
    router.refresh();
  }

  async function handleConfirm() {
    if (!name.trim())  return alert("Please enter your name.");
    if (!email.trim()) return alert("Please enter your email.");
    if (isGuest && !phone.trim()) return alert("Please enter your phone number.");

    setLoading(true);

    try {
      if (isGuest)        { await handleGuestBooking(); return; }
      if (isFree)         { await handleFreeBooking();  return; }
      if (paymentMethod === "pay_at_spot") { await handlePayAtSpot(); return; }
      await handleRazorpay();
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={openModal} className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm py-4 rounded-xl transition-colors">
        {isFree ? "Join Event" : `Book Now — ₹${perPerson}/person`} →
      </button>

      {isGuest && (
        <p className="text-center text-xs text-white/40 mt-2">No account needed. Book any event as a guest.</p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative w-full sm:max-w-md max-h-[90vh] overflow-y-auto bg-[#0a0f1e] border border-white/10 rounded-t-3xl sm:rounded-2xl"
            style={{ animation: "slideUp 0.3s ease-out" }}>
            <div className="flex justify-center pt-3 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="p-6 space-y-5">
              {/* Header */}
              <div>
                <h2 className="text-lg font-extrabold text-white leading-snug">{eventTitle}</h2>
                <p className="text-sm text-white/40 mt-1">{date} · {time} · {location}</p>
                {isGuest && <p className="text-xs text-amber-400/70 mt-2">Booking as guest — no account required</p>}
              </div>

              <div className="border-t border-white/5" />

              {/* Contact fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Your Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                    className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Phone {isGuest && <span className="text-amber-400">*</span>}</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210"
                      className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
                      className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/50 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Spots */}
              <div>
                <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Number of Spots</label>
                <div className="flex items-center gap-4 mt-2">
                  <button type="button" onClick={() => setSpots(Math.max(1, spots - 1))} disabled={spots <= 1}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors">−</button>
                  <span className="text-xl font-extrabold text-white tabular-nums w-8 text-center">{spots}</span>
                  <button type="button" onClick={() => setSpots(Math.min(spotsLeft, spots + 1))} disabled={spots >= spotsLeft}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-lg flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors">+</button>
                  <span className="text-xs text-white/40 ml-auto">{spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left</span>
                </div>
              </div>

              {/* Price + payment for paid events */}
              {!isFree && (
                <>
                  <div className="border-t border-white/5" />
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Spot price</span><span className="text-white/70">₹{perPerson}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/40">Qty</span><span className="text-white/70">× {spots}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between">
                      <span className="text-sm font-bold text-white">Total</span>
                      <span className="text-lg font-extrabold text-amber-400">₹{total}</span>
                    </div>
                  </div>

                  <div className="border-t border-white/5" />

                  {/* Payment method */}
                  <div>
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Payment Method</label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {([
                        { key: "razorpay",    label: "Pay Online",    sub: "Card / UPI / Net Banking" },
                        { key: "pay_at_spot", label: "Pay at Spot",   sub: "Cash on arrival" },
                      ] as const).map(({ key, label, sub }) => (
                        <button key={key} type="button" onClick={() => setPaymentMethod(key)}
                          className={`p-3 rounded-xl border text-center transition-all ${
                            paymentMethod === key
                              ? "bg-amber-400/10 border-amber-400/40 ring-1 ring-amber-400/20"
                              : "bg-white/[0.03] border-white/10 hover:border-white/20"
                          }`}>
                          <p className={`text-sm font-bold ${paymentMethod === key ? "text-amber-400" : "text-white/70"}`}>{label}</p>
                          <p className="text-[10px] text-white/50 mt-0.5">{sub}</p>
                        </button>
                      ))}
                    </div>

                    {paymentMethod === "razorpay" && (
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 mt-2 flex items-center gap-2">
                        <span className="text-green-400 text-sm">🔒</span>
                        <p className="text-xs text-white/50">Secure payment via Razorpay. Card, UPI, Net Banking all accepted.</p>
                      </div>
                    )}
                    {paymentMethod === "pay_at_spot" && (
                      <div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 mt-2">
                        <p className="text-xs text-white/50">Pay the host directly when you arrive. Spot is reserved for you.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Confirm */}
              <button onClick={handleConfirm} disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-bold text-sm py-4 rounded-xl transition-colors">
                {loading ? "Processing..." : isFree ? "Confirm Booking →" : paymentMethod === "razorpay" ? `Pay ₹${total} →` : `Reserve Spot →`}
              </button>

              <button onClick={closeModal} disabled={loading} className="w-full text-center text-sm text-white/50 hover:text-white/60 transition-colors py-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

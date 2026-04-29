"use client";

import { SPORT_OPTIONS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CreateEventForm(_props: { userId: string; userName: string }) {
  const router = useRouter();

  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [form, setForm] = useState({
    title: "", sport: "Cricket", description: "",
    date: "", time: "", location: "",
    capacity: 20, reserved_slots: 0, total_cost: 0,
    upi_id: "", upi_qr_url: "",
  });

  const [qrUploading, setQrUploading] = useState(false);
  const [qrPreview,   setQrPreview]   = useState<string | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setQrUploading(true);
    try {
      const data = new FormData();
      data.append("image", file);
      const res  = await fetch("https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5", {
        method: "POST", body: data,
      });
      const json = await res.json();
      const url  = json?.image?.url;
      if (url) {
        setForm(prev => ({ ...prev, upi_qr_url: url }));
        setQrPreview(url);
      } else {
        alert("QR upload failed. Try again.");
      }
    } catch {
      alert("Upload failed. Check your connection.");
    } finally {
      setQrUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/events", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:          form.title.trim(),
        sport:          form.sport,
        description:    form.description.trim() || null,
        date:           form.date,
        time:           form.time,
        location:       form.location.trim(),
        capacity:       Number(form.capacity),
        reserved_slots: Number(form.reserved_slots),
        total_cost:     Number(form.total_cost),
        upi_id:         Number(form.total_cost) > 0 ? form.upi_id.trim() : null,
        upi_qr_url:     Number(form.total_cost) > 0 ? form.upi_qr_url || null : null,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.id) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }
    router.push(`/events/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Event Title *</label>
        <input type="text" name="title" value={form.title} onChange={handleChange} required
          placeholder='e.g. "Sunday Morning Cricket at Fateh Sagar"'
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none transition" />
      </div>

      {/* Sport */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Sport *</label>
        <select name="sport" value={form.sport} onChange={handleChange} required
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition">
          {SPORT_OPTIONS.map(s => (
            <option key={s.label} value={s.label}>{s.emoji} {s.label}</option>
          ))}
        </select>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Date *</label>
          <input type="date" name="date" value={form.date} onChange={handleChange} required
            min={new Date().toISOString().split("T")[0]}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
        </div>
        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Time *</label>
          <input type="time" name="time" value={form.time} onChange={handleChange} required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Location *</label>
        <input type="text" name="location" value={form.location} onChange={handleChange} required
          placeholder='e.g. "Fateh Sagar Ground, Udaipur"'
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none transition" />
      </div>

      {/* Capacity */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Max Players *</label>
        <input type="number" name="capacity" value={form.capacity} onChange={handleChange} required min={2} max={500}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
        <p className="text-xs text-white/40 mt-1">Maximum number of players allowed to join</p>
      </div>

      {/* Reserved slots */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
          Reserved Slots <span className="normal-case text-white/30">(for you + friends)</span>
        </label>
        <input type="number" name="reserved_slots" value={form.reserved_slots} onChange={handleChange}
          min={0} max={Math.max(0, Number(form.capacity) - 1)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
        <p className="text-xs text-white/40 mt-1">
          Others can only book the remaining {Math.max(0, Number(form.capacity) - Number(form.reserved_slots))} spots.
        </p>
      </div>

      {/* Cost */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
          Total Event Cost (₹) <span className="normal-case text-white/30">(0 = free)</span>
        </label>
        <input type="number" name="total_cost" value={form.total_cost} onChange={handleChange} min={0}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
        {Number(form.total_cost) > 0 && Number(form.capacity) > 0 && (
          <p className="text-xs text-amber-400 font-semibold mt-1">
            ₹{Math.ceil(Number(form.total_cost) / Number(form.capacity))} per person
          </p>
        )}
      </div>

      {/* UPI ID + QR (paid events only) */}
      {Number(form.total_cost) > 0 && (
        <div className="space-y-4 bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <p className="text-xs font-bold tracking-widest uppercase text-amber-400">Payment Details</p>

          {/* UPI ID */}
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">UPI ID</label>
            <input type="text" name="upi_id" value={form.upi_id} onChange={handleChange}
              placeholder="e.g. yourname@upi or 9876543210@paytm"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none transition" />
            <p className="text-xs text-white/40 mt-1">Players can copy this to pay you</p>
          </div>

          {/* QR Code upload */}
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
              UPI QR Code <span className="normal-case text-white/30">(optional)</span>
            </label>

            {qrPreview ? (
              <div className="flex items-center gap-4">
                <img src={qrPreview} alt="UPI QR" className="w-24 h-24 rounded-xl border border-white/10 object-cover" />
                <button type="button" onClick={() => { setQrPreview(null); setForm(p => ({ ...p, upi_qr_url: "" })); }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors">
                  Remove
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => qrInputRef.current?.click()} disabled={qrUploading}
                className="w-full border-2 border-dashed border-white/10 hover:border-amber-400/30 rounded-xl py-6 flex flex-col items-center gap-2 transition-colors disabled:opacity-50">
                {qrUploading ? (
                  <p className="text-sm text-white/40">Uploading...</p>
                ) : (
                  <>
                    <span className="text-2xl">📷</span>
                    <p className="text-sm text-white/50">Upload your UPI QR code</p>
                    <p className="text-xs text-white/30">Players scan this to pay directly</p>
                  </>
                )}
              </button>
            )}
            <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} className="hidden" />
          </div>
        </div>
      )}

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40">
            Description <span className="normal-case text-white/30">(optional)</span>
          </label>
          <button type="button" disabled={aiLoading}
            onClick={async () => {
              setAiLoading(true);
              const res = await fetch("/api/ai/describe-event", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: form.title, sport: form.sport, location: form.location, date: form.date, isFree: Number(form.total_cost) === 0, perPerson: form.capacity > 0 ? Math.ceil(Number(form.total_cost) / Number(form.capacity)) : 0 }),
              });
              const { description } = await res.json();
              if (description) setForm(prev => ({ ...prev, description }));
              setAiLoading(false);
            }}
            className="text-xs font-semibold text-amber-500 hover:text-amber-400 disabled:opacity-50 transition-colors flex items-center gap-1">
            {aiLoading ? "Writing..." : "✨ Write for me"}
          </button>
        </div>
        <textarea name="description" value={form.description} onChange={handleChange} rows={3}
          placeholder="Any extra details — skill level, what to bring, parking info, etc."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none transition resize-none" />
      </div>

      <button type="submit" disabled={loading}
        className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold disabled:opacity-60 disabled:cursor-not-allowed text-sm py-4 rounded-xl transition-colors">
        {loading ? "Creating event..." : "Create Event →"}
      </button>

    </form>
  );
}

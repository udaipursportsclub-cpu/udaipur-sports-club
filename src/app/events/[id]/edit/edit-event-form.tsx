/**
 * FILE: src/app/events/[id]/edit/edit-event-form.tsx
 * Form for editing an existing event. Pre-fills all current values.
 */

"use client";

import { SPORT_OPTIONS } from "@/lib/types";
import { useRouter }     from "next/navigation";
import { useState }      from "react";

type EventData = {
  id: string; title: string; sport: string; description: string | null;
  date: string; time: string; location: string; capacity: number;
  total_cost: number; upi_id: string | null;
};

export default function EditEventForm({ event }: { event: EventData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [form, setForm] = useState({
    title:       event.title,
    sport:       event.sport,
    description: event.description ?? "",
    date:        event.date,
    time:        event.time.slice(0, 5), // "07:00:00" → "07:00"
    location:    event.location,
    capacity:    event.capacity,
    total_cost:  event.total_cost ?? 0,
    upi_id:      event.upi_id ?? "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/events/${event.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        capacity:   Number(form.capacity),
        total_cost: Number(form.total_cost),
        upi_id:     Number(form.total_cost) > 0 ? form.upi_id : null,
        description: form.description.trim() || null,
      }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    router.push(`/events/${event.id}`);
    router.refresh();
  }

  // ── Cancel event ──────────────────────────────────────────────────────
  const [cancelConfirm, setCancelConfirm] = useState(false);
  async function handleCancel() {
    if (!cancelConfirm) { setCancelConfirm(true); return; }
    setLoading(true);
    await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    router.push("/events");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Event Title</label>
          <input name="title" value={form.title} onChange={handleChange} required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
        </div>

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Sport</label>
          <select name="sport" value={form.sport} onChange={handleChange}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition">
            {SPORT_OPTIONS.map((s) => (
              <option key={s.label} value={s.label}>{s.emoji} {s.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Date</label>
            <input type="date" name="date" value={form.date} onChange={handleChange} required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
          </div>
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Time</label>
            <input type="time" name="time" value={form.time} onChange={handleChange} required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Location</label>
          <input name="location" value={form.location} onChange={handleChange} required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
        </div>

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Max Players</label>
          <input type="number" name="capacity" value={form.capacity} onChange={handleChange} required min={2} max={500}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
        </div>

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
            Total Cost (₹) <span className="normal-case text-white/30">(0 = free)</span>
          </label>
          <input type="number" name="total_cost" value={form.total_cost} onChange={handleChange} min={0}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
          {Number(form.total_cost) > 0 && Number(form.capacity) > 0 && (
            <p className="text-xs text-amber-400 font-semibold mt-1">
              ₹{Math.ceil(Number(form.total_cost) / Number(form.capacity))} per person
            </p>
          )}
        </div>

        {Number(form.total_cost) > 0 && (
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Your UPI ID</label>
            <input name="upi_id" value={form.upi_id} onChange={handleChange}
              placeholder="yourname@upi"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition" />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-white/40 mb-2">
            Description <span className="normal-case text-white/30">(optional)</span>
          </label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/50 focus:outline-none transition resize-none" />
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold disabled:opacity-60 text-sm py-4 rounded-xl transition-colors">
          {loading ? "Saving..." : "Save Changes →"}
        </button>
      </form>

      {/* Cancel event section */}
      <div className="border-t border-white/5 pt-6">
        {cancelConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-white/60 font-medium">
              Cancel this event? All RSVPed members will be notified by email.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setCancelConfirm(false)}
                className="bg-white/5 hover:bg-white/10 text-white/60 font-semibold text-sm py-3 rounded-xl transition-colors">
                Keep Event
              </button>
              <button onClick={handleCancel} disabled={loading}
                className="bg-red-500 hover:bg-red-400 disabled:opacity-60 text-white font-bold text-sm py-3 rounded-xl transition-colors">
                {loading ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={handleCancel}
            className="w-full text-red-400 hover:text-red-300 border border-red-400/20 hover:border-red-400/30 text-sm font-semibold py-3 rounded-xl transition-colors">
            Cancel This Event
          </button>
        )}
      </div>
    </div>
  );
}

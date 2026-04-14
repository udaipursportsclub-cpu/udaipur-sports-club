/**
 * FILE: src/app/events/new/create-event-form.tsx
 *
 * What this does:
 * This is the form where a logged-in user fills in the details
 * to create a new sports event. When they submit, it saves the
 * event to the database and takes them to the event's page.
 *
 * "use client" means this runs in the browser — needed because
 * it has interactive elements (form inputs, button clicks).
 */

"use client";

import { SPORT_OPTIONS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CreateEventForm(_props: { userId: string; userName: string }) {
  const router = useRouter();

  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [aiLoading,     setAiLoading]     = useState(false);

  // All the form fields stored in one object
  const [form, setForm] = useState({
    title: "",
    sport: "Cricket",
    description: "",
    date: "",
    time: "",
    location: "",
    capacity: 20,
    total_cost: 0,   // 0 means free event
    upi_id: "",      // host's UPI ID — only needed if cost > 0
  });

  // Update a single field in the form when the user types
  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  /**
   * handleSubmit()
   * Called when the user clicks "Create Event".
   * Saves the event to Supabase, then redirects to the event page.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/events", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:       form.title.trim(),
        sport:       form.sport,
        description: form.description.trim() || null,
        date:        form.date,
        time:        form.time,
        location:    form.location.trim(),
        capacity:    Number(form.capacity),
        total_cost:  Number(form.total_cost),
        upi_id:      Number(form.total_cost) > 0 ? form.upi_id.trim() : null,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.id) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Success — go to the new event's page
    router.push(`/events/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Error message (only shown if something goes wrong) */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* ── EVENT TITLE ─────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
          Event Title *
        </label>
        <input
          type="text"
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          placeholder='e.g. "Sunday Morning Cricket at Fateh Sagar"'
          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
      </div>

      {/* ── SPORT TYPE ──────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
          Sport *
        </label>
        <select
          name="sport"
          value={form.sport}
          onChange={handleChange}
          required
          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        >
          {SPORT_OPTIONS.map((s) => (
            <option key={s.label} value={s.label}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── DATE & TIME (side by side) ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
            Date *
          </label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            min={new Date().toISOString().split("T")[0]} // Can't create events in the past
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
            Time *
          </label>
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
          />
        </div>
      </div>

      {/* ── LOCATION ────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
          Location *
        </label>
        <input
          type="text"
          name="location"
          value={form.location}
          onChange={handleChange}
          required
          placeholder='e.g. "Fateh Sagar Ground, Udaipur"'
          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
      </div>

      {/* ── CAPACITY ────────────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
          Max Players *
        </label>
        <input
          type="number"
          name="capacity"
          value={form.capacity}
          onChange={handleChange}
          required
          min={2}
          max={500}
          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
        <p className="text-xs text-slate-400 mt-1">
          Maximum number of players allowed to join
        </p>
      </div>

      {/* ── COST ────────────────────────────────────────────────── */}
      {/* 0 = free event. Any amount = paid event with UPI collection */}
      <div>
        <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
          Total Event Cost (₹){" "}
          <span className="normal-case text-slate-300">(0 = free)</span>
        </label>
        <input
          type="number"
          name="total_cost"
          value={form.total_cost}
          onChange={handleChange}
          min={0}
          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
        />
        {/* Show the per-person breakdown live as they type */}
        {Number(form.total_cost) > 0 && Number(form.capacity) > 0 && (
          <p className="text-xs text-amber-600 font-semibold mt-1">
            ₹{Math.ceil(Number(form.total_cost) / Number(form.capacity))} per person
            {" "}({form.capacity} players × ₹{Math.ceil(Number(form.total_cost) / Number(form.capacity))} = ₹{Number(form.capacity) * Math.ceil(Number(form.total_cost) / Number(form.capacity))})
          </p>
        )}
      </div>

      {/* ── UPI ID (only shown for paid events) ─────────────────── */}
      {Number(form.total_cost) > 0 && (
        <div>
          <label className="block text-xs font-bold tracking-widest uppercase text-slate-500 mb-2">
            Your UPI ID *
          </label>
          <input
            type="text"
            name="upi_id"
            value={form.upi_id}
            onChange={handleChange}
            required={Number(form.total_cost) > 0}
            placeholder="e.g. yourname@upi or 9876543210@paytm"
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition"
          />
          <p className="text-xs text-slate-400 mt-1">
            Players will pay directly to this UPI ID
          </p>
        </div>
      )}

      {/* ── DESCRIPTION (optional) ──────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold tracking-widest uppercase text-slate-500">
            Description <span className="normal-case text-slate-300">(optional)</span>
          </label>
          <button
            type="button"
            disabled={aiLoading}
            onClick={async () => {
              setAiLoading(true);
              const res = await fetch("/api/ai/describe-event", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title:     form.title,
                  sport:     form.sport,
                  location:  form.location,
                  date:      form.date,
                  isFree:    Number(form.total_cost) === 0,
                  perPerson: form.capacity > 0 ? Math.ceil(Number(form.total_cost) / Number(form.capacity)) : 0,
                }),
              });
              const { description } = await res.json();
              if (description) setForm((prev) => ({ ...prev, description }));
              setAiLoading(false);
            }}
            className="text-xs font-semibold text-amber-500 hover:text-amber-400 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            {aiLoading ? "Writing..." : "✨ Write for me"}
          </button>
        </div>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="Any extra details — skill level, what to bring, parking info, etc."
          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition resize-none"
        />
      </div>

      {/* ── SUBMIT BUTTON ───────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm py-4 rounded-xl transition-colors"
      >
        {loading ? "Creating event..." : "Create Event →"}
      </button>

    </form>
  );
}

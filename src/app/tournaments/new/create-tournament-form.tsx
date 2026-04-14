/**
 * FILE: src/app/tournaments/new/create-tournament-form.tsx
 *
 * Client component — the form where hosts fill in tournament details.
 * On submit, calls POST /api/tournaments and redirects to the tournament page.
 */

"use client";

import { SPORT_OPTIONS } from "@/lib/types";
import { useRouter }     from "next/navigation";
import { useState }      from "react";

const FORMAT_OPTIONS = [
  { value: "knockout",        label: "Knockout (Single Elimination)" },
  { value: "league",          label: "League (Round Robin)" },
  { value: "round_robin",     label: "Round Robin" },
  { value: "groups_knockout", label: "Groups + Knockout" },
];

export default function CreateTournamentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [form, setForm] = useState({
    title:       "",
    sport:       "Cricket",
    format:      "knockout",
    team_size:   5,
    max_teams:   8,
    entry_fee:   0,
    upi_id:      "",
    description: "",
    start_date:  "",
    end_date:    "",
    rules:       "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/tournaments", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...form,
        team_size:  Number(form.team_size),
        max_teams:  Number(form.max_teams),
        entry_fee:  Number(form.entry_fee),
        upi_id:     Number(form.entry_fee) > 0 ? form.upi_id.trim() : null,
        description: form.description.trim() || null,
        rules:       form.rules.trim() || null,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.id) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    router.push(`/tournaments/${data.id}`);
  }

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:border-amber-400/50 focus:outline-none transition";
  const labelClass = "block text-xs font-bold tracking-widest uppercase text-white/40 mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 text-red-400 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>Tournament Title *</label>
        <input
          type="text" name="title" value={form.title} onChange={handleChange} required
          placeholder='e.g. "USC Cricket Premier League 2026"'
          className={inputClass}
        />
      </div>

      {/* Sport */}
      <div>
        <label className={labelClass}>Sport *</label>
        <select name="sport" value={form.sport} onChange={handleChange} required className={inputClass}>
          {SPORT_OPTIONS.map(s => (
            <option key={s.label} value={s.label}>{s.emoji} {s.label}</option>
          ))}
        </select>
      </div>

      {/* Format */}
      <div>
        <label className={labelClass}>Format *</label>
        <select name="format" value={form.format} onChange={handleChange} required className={inputClass}>
          {FORMAT_OPTIONS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Team Size + Max Teams */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Players per Team *</label>
          <input
            type="number" name="team_size" value={form.team_size} onChange={handleChange}
            required min={1} max={30}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Max Teams *</label>
          <input
            type="number" name="max_teams" value={form.max_teams} onChange={handleChange}
            required min={2} max={64}
            className={inputClass}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Start Date</label>
          <input
            type="date" name="start_date" value={form.start_date} onChange={handleChange}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>End Date</label>
          <input
            type="date" name="end_date" value={form.end_date} onChange={handleChange}
            className={inputClass}
          />
        </div>
      </div>

      {/* Entry Fee */}
      <div>
        <label className={labelClass}>
          Entry Fee per Team (₹) <span className="normal-case text-white/15">(0 = free)</span>
        </label>
        <input
          type="number" name="entry_fee" value={form.entry_fee} onChange={handleChange}
          min={0} className={inputClass}
        />
      </div>

      {/* UPI — only for paid */}
      {Number(form.entry_fee) > 0 && (
        <div>
          <label className={labelClass}>Your UPI ID *</label>
          <input
            type="text" name="upi_id" value={form.upi_id} onChange={handleChange}
            required={Number(form.entry_fee) > 0}
            placeholder="e.g. yourname@upi"
            className={inputClass}
          />
          <p className="text-xs text-white/20 mt-1">Teams will pay to this UPI ID</p>
        </div>
      )}

      {/* Description */}
      <div>
        <label className={labelClass}>Description <span className="normal-case text-white/15">(optional)</span></label>
        <textarea
          name="description" value={form.description} onChange={handleChange}
          rows={3} placeholder="Tournament details, venue info, prizes, etc."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Rules */}
      <div>
        <label className={labelClass}>Rules <span className="normal-case text-white/15">(optional)</span></label>
        <textarea
          name="rules" value={form.rules} onChange={handleChange}
          rows={3} placeholder="Match duration, scoring rules, tie-breaker rules, etc."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Submit */}
      <button
        type="submit" disabled={loading}
        className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold disabled:opacity-60 disabled:cursor-not-allowed text-sm py-4 rounded-xl transition-colors"
      >
        {loading ? "Creating tournament..." : "Create Tournament →"}
      </button>
    </form>
  );
}

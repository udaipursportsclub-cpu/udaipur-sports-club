"use client";

/**
 * Manual posting tool — admin uploads photo/video, writes or AI-generates
 * a caption, and fires it to Instagram + X with one click.
 */

import { useState, useRef } from "react";

export default function PostNow() {
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);
  const [caption, setCaption]     = useState("");
  const [platform, setPlatform]   = useState("all");
  const [mediaType, setMediaType] = useState("image");
  const [loading, setLoading]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult]       = useState<{ results: Record<string, string>; caption: string } | null>(null);
  const [error, setError]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setMediaType(f.type.startsWith("video") ? "reel" : "image");
    const url = URL.createObjectURL(f);
    setPreview(url);
    setResult(null);
  }

  async function generateCaption() {
    setGenerating(true);
    try {
      const fd = new FormData();
      fd.append("caption",   "");
      fd.append("platform",  platform);
      fd.append("mediaType", mediaType);
      if (file) fd.append("file", file);

      const res  = await fetch("/api/admin/post-social", { method: "POST", body: fd });
      const data = await res.json();
      if (data.caption) setCaption(data.caption);
    } catch {
      setError("Caption generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePost() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("caption",   caption);
      fd.append("platform",  platform);
      fd.append("mediaType", mediaType);
      if (file) fd.append("file", file);

      const res  = await fetch("/api/admin/post-social", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Post failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Post failed");
    } finally {
      setLoading(false);
    }
  }

  function statusColor(s: string) {
    if (s === "posted")         return "text-green-600 bg-green-50";
    if (s.startsWith("processing")) return "text-blue-600 bg-blue-50";
    if (s === "not_configured") return "text-slate-400 bg-stone-50";
    return "text-red-500 bg-red-50";
  }

  return (
    <div className="space-y-5">

      {/* File upload */}
      <div>
        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">
          Photo or Video
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-stone-200 hover:border-amber-300 rounded-2xl p-6 text-center cursor-pointer transition-all"
        >
          {preview ? (
            mediaType === "reel"
              ? <video src={preview} className="max-h-40 mx-auto rounded-xl" controls />
              : <img src={preview} alt="preview" className="max-h-40 mx-auto rounded-xl object-cover" />
          ) : (
            <div>
              <p className="text-3xl mb-2">📸</p>
              <p className="text-sm text-slate-400">Click to upload photo or video</p>
              <p className="text-xs text-slate-300 mt-1">JPG, PNG, MP4 — max 50MB</p>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/mov"
          className="hidden"
          onChange={onFileChange}
        />
        {file && (
          <p className="text-xs text-slate-400 mt-1.5">
            {file.name} · {(file.size / 1024 / 1024).toFixed(1)}MB
            {mediaType === "reel" && <span className="ml-2 text-blue-500 font-semibold">🎬 Reel</span>}
          </p>
        )}
      </div>

      {/* Caption */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Caption
          </label>
          <button
            onClick={generateCaption}
            disabled={generating}
            className="text-xs font-semibold text-amber-600 hover:text-amber-500 disabled:opacity-50 flex items-center gap-1"
          >
            {generating ? "Generating..." : "✨ Write with AI"}
          </button>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption, or use AI to generate one..."
          rows={4}
          className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none transition"
        />
        <p className="text-xs text-slate-300 mt-1">{caption.length} / 2200 chars</p>
      </div>

      {/* Platform selector */}
      <div>
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
          Post to
        </label>
        <div className="flex gap-2">
          {[
            { key: "all",       label: "All Platforms" },
            { key: "instagram", label: "Instagram only" },
            { key: "twitter",   label: "X only" },
          ].map((p) => (
            <button
              key={p.key}
              onClick={() => setPlatform(p.key)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                platform === p.key
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-stone-200 hover:border-amber-300"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {/* Result */}
      {result && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Posted</p>
          {Object.entries(result.results).map(([plat, status]) => (
            <div key={plat} className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 capitalize">{plat}</span>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor(status)}`}>
                {status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Post button */}
      <button
        onClick={handlePost}
        disabled={loading || (!caption && !file)}
        className="w-full bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-sm py-4 rounded-2xl transition-all"
      >
        {loading ? "Posting..." : "🚀 Post Now"}
      </button>

    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Slide = { id: string; image_url: string; display_order: number; active: boolean };

export default function HeroAdminClient({
  initialSlides,
  initialRotation,
}: {
  initialSlides: Slide[];
  initialRotation: number;
}) {
  const router = useRouter();
  const [slides, setSlides]           = useState<Slide[]>(initialSlides);
  const [rotation, setRotation]       = useState(initialRotation);
  const [uploading, setUploading]     = useState(false);
  const [savingRotation, setSaving]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const res  = await fetch("https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a5", { method: "POST", body: form });
      const json = await res.json();
      const url  = json?.image?.url;
      if (!url) { alert("Upload failed. Try again."); return; }

      const addRes = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: url }),
      });
      const added = await addRes.json();
      if (added.id) {
        setSlides(prev => [...prev, added]);
        router.refresh();
      }
    } catch {
      alert("Upload failed. Check your connection.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this slide?")) return;
    await fetch("/api/admin/hero-slides", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSlides(prev => prev.filter(s => s.id !== id));
  }

  async function saveRotation() {
    setSaving(true);
    await fetch("/api/admin/hero-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rotation_seconds: rotation }),
    });
    setSaving(false);
    alert("Rotation timing saved!");
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-black text-white">Hero Banner</h1>
        <p className="text-sm text-white/40 mt-1">
          These photos show as the full-screen background on the homepage. Upload up to as many as you want — they auto-rotate.
        </p>
      </div>

      {/* Current slides */}
      <div className="space-y-4">
        <p className="text-xs font-bold tracking-widest uppercase text-white/40">
          {slides.length === 0 ? "No slides yet" : `${slides.length} slide${slides.length !== 1 ? "s" : ""}`}
        </p>

        {slides.length === 0 && (
          <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl py-16 text-center">
            <p className="text-4xl mb-3">🖼️</p>
            <p className="text-white/40 text-sm">No images yet. Upload your first one below.</p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {slides.map((slide, i) => (
            <div key={slide.id} className="relative group rounded-2xl overflow-hidden border border-white/10 aspect-video bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slide.image_url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <span className="text-xs font-bold text-white/70">#{i + 1}</span>
                <button
                  onClick={() => handleDelete(slide.id)}
                  className="bg-red-500 hover:bg-red-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload new */}
      <div>
        <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-3">Add Photo</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full border-2 border-dashed border-white/10 hover:border-amber-400/40 rounded-2xl py-10 flex flex-col items-center gap-3 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <p className="text-sm text-white/40">Uploading...</p>
          ) : (
            <>
              <span className="text-3xl">📸</span>
              <p className="text-sm font-bold text-white/60">Click to upload a photo</p>
              <p className="text-xs text-white/30">Landscape photos work best (any size)</p>
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>

      {/* Rotation timing */}
      {slides.length > 1 && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-white/40 mb-1">Auto-Rotate Speed</p>
            <p className="text-xs text-white/30">How many seconds each photo stays on screen before switching</p>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={2}
              max={30}
              value={rotation}
              onChange={e => setRotation(Number(e.target.value))}
              className="flex-1 accent-amber-400"
            />
            <span className="text-xl font-black text-amber-400 w-20 text-center">{rotation}s</span>
          </div>
          <div className="flex gap-2">
            {[3, 5, 8, 10, 15].map(v => (
              <button
                key={v}
                type="button"
                onClick={() => setRotation(v)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                  rotation === v ? "bg-amber-400/20 border-amber-400/40 text-amber-400" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                }`}
              >
                {v}s
              </button>
            ))}
          </div>
          <button
            onClick={saveRotation}
            disabled={savingRotation}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-extrabold text-sm py-3 rounded-xl transition-colors"
          >
            {savingRotation ? "Saving..." : "Save Timing →"}
          </button>
        </div>
      )}

      <div className="pt-4 border-t border-white/5">
        <a
          href="/"
          target="_blank"
          className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
        >
          Preview homepage →
        </a>
      </div>
    </div>
  );
}

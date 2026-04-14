"use client";

/**
 * FILE: src/app/photos/my-photos-gallery.tsx
 *
 * Shows user's matched photos + "Scan more events" to find
 * themselves in photos they haven't been matched to yet.
 */

import { useState, useRef } from "react";
import Link from "next/link";

type Photo = { id: string; photo_url: string; event_id: string; created_at: string };
type EventInfo = { id: string; title: string; date: string };

export default function MyPhotosGallery({
  matchedPhotos,
  eventsWithPhotos,
  userId,
}: {
  matchedPhotos: Photo[];
  eventsWithPhotos: EventInfo[];
  userId: string;
}) {
  const [scanning, setScanning]     = useState(false);
  const [scanResult, setScanResult] = useState("");
  const [lightbox, setLightbox]     = useState<string | null>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  async function scanAllEvents(file: File) {
    setScanning(true);
    setScanResult("Loading face detection...");

    try {
      const faceapi = await import("face-api.js");

      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

      // Get selfie descriptor
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload  = () => resolve();
        img.onerror = () => reject(new Error("Failed"));
        img.src = URL.createObjectURL(file);
      });

      const detection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setScanResult("No face found in your photo. Try a clearer selfie!");
        setScanning(false);
        return;
      }

      const selfieDesc = detection.descriptor;
      let totalMatches = 0;

      // Scan each event
      for (let i = 0; i < eventsWithPhotos.length; i++) {
        const ev = eventsWithPhotos[i];
        setScanResult(`Scanning event ${i + 1}/${eventsWithPhotos.length}: ${ev.title}...`);

        const res = await fetch(`/api/photos/faces?eventId=${ev.id}`);
        const data = await res.json();

        if (!data.faces || data.faces.length === 0) continue;

        const THRESHOLD = 0.5;
        const matchedFaceIds: string[] = [];

        for (const face of data.faces) {
          if (face.matched_user_id === userId) continue; // Already matched
          const stored = new Float32Array(face.descriptor);
          const dist = faceapi.euclideanDistance(selfieDesc, stored);
          if (dist < THRESHOLD) {
            matchedFaceIds.push(face.id);
          }
        }

        if (matchedFaceIds.length > 0) {
          totalMatches += matchedFaceIds.length;
          await fetch("/api/photos/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ faceIds: matchedFaceIds, userId }),
          });
        }
      }

      if (totalMatches > 0) {
        setScanResult(`Found ${totalMatches} new match${totalMatches > 1 ? "es" : ""}! Refresh to see them.`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setScanResult("No new matches found. Check back after more events!");
      }
    } catch (e) {
      console.error(e);
      setScanResult("Scan failed. Please try again.");
    }

    setScanning(false);
  }

  return (
    <div className="space-y-8">
      {/* Scan button */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-extrabold text-slate-900">Find yourself in event photos</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Take a selfie — we&apos;ll scan all event photos to find you.
            </p>
          </div>

          <button
            onClick={() => !scanning && selfieRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {scanning ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scanning...
              </>
            ) : (
              <>🔍 Find me</>
            )}
          </button>

          <input
            ref={selfieRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) scanAllEvents(file);
              e.target.value = "";
            }}
          />
        </div>

        {scanResult && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-amber-700">{scanResult}</p>
          </div>
        )}
      </div>

      {/* Matched photos */}
      {matchedPhotos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <p className="text-4xl mb-3">📸</p>
          <p className="text-lg font-bold text-slate-900">No matched photos yet</p>
          <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
            Tap &quot;Find me&quot; above to scan event photos. Once your face is matched,
            all your photos will appear here automatically.
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
            Your photos ({matchedPhotos.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {matchedPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border-2 border-transparent hover:border-amber-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.photo_url}
                  alt="Your photo"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onClick={() => setLightbox(photo.photo_url)}
                />
                <Link
                  href={`/events/${photo.event_id}/photos`}
                  className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm hover:bg-black/80"
                >
                  View event &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events with photos */}
      {eventsWithPhotos.length > 0 && (
        <div>
          <h2 className="text-xs font-bold tracking-widest uppercase text-slate-400 mb-4">
            Events with photos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {eventsWithPhotos.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}/photos`}
                className="flex items-center justify-between bg-white border border-stone-200 hover:border-amber-300 rounded-xl px-5 py-4 transition-colors group"
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{ev.title}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className="text-slate-300 group-hover:text-amber-400 transition-colors">&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-6 right-6 text-white text-3xl font-bold hover:text-amber-400 z-10"
            onClick={() => setLightbox(null)}
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Full size"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

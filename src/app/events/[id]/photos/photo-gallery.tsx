"use client";

/**
 * FILE: src/app/events/[id]/photos/photo-gallery.tsx
 *
 * Displays event photos in a masonry-style grid.
 * Has a "Find me" button that:
 * 1. Opens camera or lets user pick a selfie
 * 2. Runs face-api.js to get face descriptor
 * 3. Compares against all faces in event photos
 * 4. Highlights matching photos
 */

import { useState, useRef } from "react";

type Photo = {
  id: string;
  photo_url: string;
  created_at: string;
};

export default function PhotoGallery({
  photos,
  eventId,
  userId,
}: {
  photos: Photo[];
  eventId: string;
  userId: string | null;
}) {
  const [finding, setFinding]       = useState(false);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [filterOn, setFilterOn]     = useState(false);
  const [lightbox, setLightbox]     = useState<string | null>(null);
  const selfieRef = useRef<HTMLInputElement>(null);

  async function findMe(file: File) {
    setFinding(true);

    try {
      const faceapi = await import("face-api.js");

      // Load models
      await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

      // Get descriptor from selfie
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload  = () => resolve();
        img.onerror = () => reject(new Error("Failed to load selfie"));
        const url = URL.createObjectURL(file);
        img.src = url;
      });

      const selfieDetection = await faceapi
        .detectSingleFace(img)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!selfieDetection) {
        alert("No face detected in your photo. Try a clearer selfie!");
        setFinding(false);
        return;
      }

      const selfieDescriptor = selfieDetection.descriptor;

      // Fetch all face descriptors for this event
      const res = await fetch(`/api/photos/faces?eventId=${eventId}`);
      const data = await res.json();

      if (!data.faces || data.faces.length === 0) {
        alert("No faces have been indexed for this event yet.");
        setFinding(false);
        return;
      }

      // Compare selfie against all stored faces
      const THRESHOLD = 0.5; // Lower = stricter match
      const matched = new Set<string>();
      const matchedFaceIds: string[] = [];

      for (const face of data.faces) {
        const stored = new Float32Array(face.descriptor);
        const distance = faceapi.euclideanDistance(selfieDescriptor, stored);
        if (distance < THRESHOLD) {
          matched.add(face.photo_id);
          matchedFaceIds.push(face.id);
        }
      }

      setMatchedIds(matched);

      if (matched.size === 0) {
        alert("No matching photos found. Try a different selfie or angle!");
      } else {
        setFilterOn(true);

        // Save matches to database (so they appear in "My Photos" later)
        if (userId && matchedFaceIds.length > 0) {
          fetch("/api/photos/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ faceIds: matchedFaceIds, userId }),
          });
        }
      }
    } catch (e) {
      console.error("Face matching error:", e);
      alert("Face detection failed. Please try again.");
    }

    setFinding(false);
  }

  const displayPhotos = filterOn
    ? photos.filter((p) => matchedIds.has(p.id))
    : photos;

  if (photos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
        <p className="text-4xl mb-3">📷</p>
        <p className="text-lg font-bold text-slate-900">No photos yet</p>
        <p className="text-sm text-slate-400 mt-1">
          The host will upload event photos here after the game.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => !finding && selfieRef.current?.click()}
          disabled={finding}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {finding ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Scanning faces...
            </>
          ) : (
            <>🔍 Find me in photos</>
          )}
        </button>

        {filterOn && (
          <>
            <span className="text-sm font-semibold text-green-600">
              Found you in {matchedIds.size} photo{matchedIds.size !== 1 ? "s" : ""}!
            </span>
            <button
              onClick={() => { setFilterOn(false); setMatchedIds(new Set()); }}
              className="text-xs text-slate-400 hover:text-slate-700 underline"
            >
              Show all
            </button>
          </>
        )}

        <input
          ref={selfieRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) findMe(file);
            e.target.value = "";
          }}
        />

        <span className="text-xs text-slate-400 ml-auto">
          {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {displayPhotos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => setLightbox(photo.photo_url)}
            className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group border-2 transition-all ${
              matchedIds.has(photo.id)
                ? "border-green-400 ring-2 ring-green-200"
                : "border-transparent hover:border-amber-300"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.photo_url}
              alt="Event photo"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {matchedIds.has(photo.id) && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                That&apos;s you!
              </div>
            )}
          </div>
        ))}
      </div>

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

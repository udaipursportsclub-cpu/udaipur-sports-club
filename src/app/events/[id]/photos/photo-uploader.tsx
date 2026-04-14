"use client";

/**
 * FILE: src/app/events/[id]/photos/photo-uploader.tsx
 *
 * Drag & drop or click to upload event photos.
 * After upload, runs face-api.js in the browser to detect faces
 * and sends the face descriptors to the server.
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function PhotoUploader({ eventId }: { eventId: string }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router  = useRouter();

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProgress(`Uploading ${files.length} photo${files.length > 1 ? "s" : ""}...`);

    try {
      const formData = new FormData();
      formData.append("eventId", eventId);
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const res  = await fetch("/api/photos/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!data.success) {
        setProgress(`Error: ${data.error}`);
        return;
      }

      setProgress(`Uploaded ${data.count} photos. Detecting faces...`);

      // Run face detection on each uploaded photo
      await detectFacesForPhotos(data.photos);

      setProgress(`Done! ${data.count} photos uploaded.`);
      router.refresh();

      setTimeout(() => {
        setProgress("");
        setUploading(false);
      }, 2000);
    } catch (e) {
      setProgress(`Upload failed: ${e}`);
      setUploading(false);
    }
  }

  async function detectFacesForPhotos(
    photos: { id: string; photo_url: string }[]
  ) {
    // Dynamically import face-api.js (only when needed)
    const faceapi = await import("face-api.js");

    // Load models
    await faceapi.nets.ssdMobilenetv1.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

    for (const photo of photos) {
      try {
        // Create an image element to run detection on
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload  = () => resolve();
          img.onerror = () => reject(new Error("Image load failed"));
          img.src     = photo.photo_url;
        });

        // Detect all faces with descriptors
        const detections = await faceapi
          .detectAllFaces(img)
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections.length === 0) continue;

        // Send face descriptors to server
        const faces = detections.map((d) => ({
          descriptor: Array.from(d.descriptor),
          box: {
            x:      d.detection.box.x,
            y:      d.detection.box.y,
            width:  d.detection.box.width,
            height: d.detection.box.height,
          },
        }));

        await fetch("/api/photos/faces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId: photo.id, faces }),
        });
      } catch {
        // Skip photos that fail detection
      }
    }
  }

  return (
    <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-6">
      <h2 className="font-extrabold text-white mb-1">Upload Photos</h2>
      <p className="text-xs text-white/20 mb-4">
        Upload event photos — faces are automatically detected so members can find themselves.
      </p>

      <div
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!uploading) handleUpload(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          uploading
            ? "border-amber-400/30 bg-amber-400/10"
            : "border-white/5 hover:border-amber-400/30 hover:bg-amber-400/5"
        }`}
      >
        {uploading ? (
          <div>
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-amber-400">{progress}</p>
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2">📷</p>
            <p className="text-sm font-semibold text-white/70">
              Drop photos here or click to upload
            </p>
            <p className="text-xs text-white/20 mt-1">JPG, PNG, HEIC — up to 20 photos at once</p>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
    </div>
  );
}

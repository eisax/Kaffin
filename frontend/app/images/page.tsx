"use client";

import { Layers, Plus, ShieldCheck } from "lucide-react";

export default function ImagesPage() {
  const images = [
    {
      id: "img-1",
      tag: "odoo:19.0",
      version: "19.0",
      digest: "sha256:latest-stable-19-release",
      source: "Docker Hub Official",
      size: "1.1 GB",
      status: "Recommended Base",
    },
    {
      id: "img-2",
      tag: "odoo:18.0",
      version: "18.0",
      digest: "sha256:latest-stable-18-release",
      source: "Docker Hub Official",
      size: "980 MB",
      status: "Stable Base",
    },
    {
      id: "img-3",
      tag: "odoo:17.0",
      version: "17.0",
      digest: "sha256:latest-stable-17-release",
      source: "Docker Hub Official",
      size: "890 MB",
      status: "Supported Base",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Odoo Container Images & Registry</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Container base images and pinned digests for reproducible deployments.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Register New Image</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {images.map((img) => (
          <div key={img.id} className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-zinc-100">{img.tag}</h3>
                    <span className="text-xs text-zinc-400 font-medium">{img.source}</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300">
                  Odoo {img.version}
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/60 space-y-2 text-xs">
                <div>
                  <span className="text-[11px] text-zinc-400">Image Digest Tag:</span>
                  <p className="font-mono text-[11px] text-zinc-300 truncate bg-zinc-950/80 p-1.5 rounded-lg border border-zinc-800/80 mt-1">
                    {img.digest}
                  </p>
                </div>
                <div className="flex items-center justify-between text-zinc-400 pt-1">
                  <span>Image Size: <strong className="text-zinc-200">{img.size}</strong></span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                {img.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

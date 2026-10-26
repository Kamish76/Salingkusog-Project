"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, useTransition, useRef, useEffect } from "react";
import {
  processAndDownscaleImage,
  ImageProcessResult,
} from "@/lib/image-processing";
import {
  uploadStorageImageAction,
  deleteStorageObjectAction,
} from "@/app/actions/storage";
import { StorageObjectItem } from "@/lib/storage";

interface StorageTesterClientProps {
  initialObjects: StorageObjectItem[];
  bucketName: string;
  endpointUrl: string;
}

export function StorageTesterClient({
  initialObjects,
  bucketName,
  endpointUrl,
}: StorageTesterClientProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processed, setProcessed] = useState<ImageProcessResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [enable1080p, setEnable1080p] = useState(true);
  const [maxDimension, setMaxDimension] = useState(1080);
  const [quality, setQuality] = useState(0.82);

  const [uploadPending, startUploadTransition] = useTransition();
  const [uploadStatus, setUploadStatus] = useState<{
    type: "idle" | "success" | "error";
    message?: string;
    url?: string;
  }>({ type: "idle" });

  const [deletePending, startDeleteTransition] = useTransition();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up previous blob preview URLs to prevent memory leaks during repeated testing
  useEffect(() => {
    return () => {
      if (processed?.previewUrl && processed.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(processed.previewUrl);
      }
    };
  }, [processed?.previewUrl]);

  // Trigger downscaling when file or settings change
  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    setUploadStatus({ type: "idle" });

    // Validate MIME type in browser
    if (!file.type.startsWith("image/")) {
      setUploadStatus({
        type: "error",
        message: "Storage Lock: Only image files are permitted.",
      });
      setProcessed(null);
      return;
    }

    setIsProcessing(true);
    try {
      if (enable1080p) {
        const result = await processAndDownscaleImage(
          file,
          maxDimension,
          quality
        );
        setProcessed(result);
      } else {
        // Raw image without resizing
        const previewUrl = URL.createObjectURL(file);
        const bitmap = await createImageBitmap(file);
        const originalWidth = bitmap.width;
        const originalHeight = bitmap.height;
        bitmap.close();
        setProcessed({
          blob: file,
          originalWidth,
          originalHeight,
          resizedWidth: originalWidth,
          resizedHeight: originalHeight,
          originalSize: file.size,
          resizedSize: file.size,
          savedPercentage: 0,
          previewUrl,
        });
      }
    } catch (err: unknown) {
      setUploadStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to process image in browser.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = () => {
    if (!processed || !selectedFile) return;

    startUploadTransition(async () => {
      setUploadStatus({ type: "idle" });

      const formData = new FormData();
      // Generate clean filename with .webp extension when scaled
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "");
      const finalFileName = enable1080p ? `${cleanName}.webp` : selectedFile.name;

      formData.append(
        "file",
        processed.blob,
        finalFileName
      );

      const res = await uploadStorageImageAction(formData);
      if (res.success && res.data) {
        setUploadStatus({
          type: "success",
          message: `Successfully uploaded ${res.data.key} (${formatBytes(
            res.data.size
          )})`,
          url: res.data.url,
        });
        setSelectedFile(null);
        setProcessed(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        setUploadStatus({
          type: "error",
          message: res.error || "Upload failed.",
        });
      }
    });
  };

  const handleDelete = (key: string) => {
    if (!confirm(`Are you sure you want to delete ${key} from Neon Object Storage?`)) {
      return;
    }

    startDeleteTransition(async () => {
      const formData = new FormData();
      formData.append("key", key);
      const res = await deleteStorageObjectAction(formData);
      if (!res.success) {
        alert(res.error || "Delete failed");
      }
    });
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* 1. Upload & Compression Testing Lab */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <span>Image Optimizer & Bucket Upload Tester</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                IMAGE-ONLY LOCKED
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Select or drop any image. Automatically scales down to 1080p and converts to WebP to protect your 5 GB Neon storage quota.
            </p>
          </div>

          {/* Quick Stats on Bucket */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500">Target Bucket:</span>
            <span className="px-2 py-1 rounded bg-zinc-800 text-amber-300 font-bold border border-zinc-700">
              {bucketName}
            </span>
          </div>
        </div>

        {/* Compression Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable1080p"
              checked={enable1080p}
              onChange={(e) => {
                setEnable1080p(e.target.checked);
                if (selectedFile) handleFileChange(selectedFile);
              }}
              className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer"
            />
            <label htmlFor="enable1080p" className="cursor-pointer text-zinc-200 font-medium">
              Scale Down to Max 1080p (WebP)
            </label>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Max Resolution Dimension:</label>
            <select
              value={maxDimension}
              disabled={!enable1080p}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMaxDimension(val);
                if (selectedFile) handleFileChange(selectedFile);
              }}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 disabled:opacity-40"
            >
              <option value={1080}>1080p (1080px max bound - Recommended)</option>
              <option value={720}>720p (720px max bound - Extra compact)</option>
              <option value={1920}>1920p (1920px max bound - High res)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">
              WebP Quality: <span className="text-amber-400 font-mono">{Math.round(quality * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={quality}
              disabled={!enable1080p}
              onChange={(e) => {
                const val = Number(e.target.value);
                setQuality(val);
                if (selectedFile) handleFileChange(selectedFile);
              }}
              className="w-full accent-amber-500 cursor-pointer disabled:opacity-40"
            />
          </div>
        </div>

        {/* Dropzone File Picker */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) {
              handleFileChange(e.dataTransfer.files[0]);
            }
          }}
          className="border-2 border-dashed border-zinc-700 hover:border-amber-500/60 rounded-xl p-8 text-center cursor-pointer transition bg-zinc-950/40 hover:bg-zinc-900/30 group"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={(e) => {
              if (e.target.files?.[0]) handleFileChange(e.target.files[0]);
            }}
            className="hidden"
          />
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-200">
            {selectedFile ? selectedFile.name : "Click to select or drag & drop an image here"}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Accepts PNG, JPEG, WebP, AVIF • Strictly locked to image files only
          </p>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
            <span>Optimizing and scaling image in browser...</span>
          </div>
        )}

        {/* Comparison & Metrics Preview */}
        {processed && !isProcessing && (
          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950/80 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Optimization Analysis & Preview
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/30">
                Saved {processed.savedPercentage}% Storage Space
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image Preview */}
              <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center max-h-64 relative">
                <img
                  src={processed.previewUrl}
                  alt="Optimized preview"
                  className="max-h-64 object-contain"
                />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300">
                  {processed.resizedWidth} × {processed.resizedHeight} px
                </span>
              </div>

              {/* Side-by-Side Metrics */}
              <div className="space-y-3 flex flex-col justify-between">
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex justify-between items-center">
                    <span className="text-zinc-500">Original Dimensions:</span>
                    <span className="text-zinc-300">
                      {processed.originalWidth} × {processed.originalHeight} px
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 flex justify-between items-center">
                    <span className="text-zinc-500">Original File Size:</span>
                    <span className="text-red-400 font-bold">
                      {formatBytes(processed.originalSize)}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 flex justify-between items-center">
                    <span className="text-emerald-400">Optimized Size (WebP):</span>
                    <span className="text-emerald-300 font-bold text-sm">
                      {formatBytes(processed.resizedSize)}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleUpload}
                    disabled={uploadPending}
                    className="w-full py-3 px-4 min-h-[44px] rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10 active:scale-95"
                  >
                    {uploadPending ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></span>
                        <span>Uploading to Neon Storage...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span>Upload Optimized Image to Neon</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Status Banner */}
        {uploadStatus.type === "success" && (
          <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span>✓</span>
              <span>{uploadStatus.message}</span>
            </div>
            {uploadStatus.url && (
              <div className="flex items-center gap-2 bg-zinc-900/80 p-2 rounded border border-zinc-800 font-mono text-[11px] text-zinc-300">
                <span className="truncate flex-1">{uploadStatus.url}</span>
                <button
                  onClick={() => copyToClipboard(uploadStatus.url!, "upload-banner")}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition shrink-0"
                >
                  {copiedKey === "upload-banner" ? "Copied!" : "Copy URL"}
                </button>
                <a
                  href={uploadStatus.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs transition shrink-0"
                >
                  Open ↗
                </a>
              </div>
            )}
          </div>
        )}

        {uploadStatus.type === "error" && (
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/50 text-xs text-red-300 flex items-center gap-2">
            <span>✕</span>
            <span>{uploadStatus.message}</span>
          </div>
        )}
      </div>

      {/* 2. Bucket Objects Explorer */}
      <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <span>Stored Objects in {bucketName}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                {initialObjects.length} files
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Live objects present on current Neon branch ({endpointUrl})
            </p>
          </div>
        </div>

        {initialObjects.length === 0 ? (
          <div className="p-10 rounded-lg border border-dashed border-zinc-800 text-center space-y-2">
            <p className="text-sm text-zinc-400">No objects found in bucket &apos;{bucketName}&apos;</p>
            <p className="text-xs text-zinc-500">
              Use the upload tester above to upload your first 1080p scaled image.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {initialObjects.map((item) => (
              <div
                key={item.key}
                className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/60 flex flex-col justify-between gap-3 group hover:border-zinc-700 transition"
              >
                <div className="space-y-2">
                  {/* Thumbnail */}
                  <div className="h-36 rounded bg-zinc-900 border border-zinc-800/80 overflow-hidden flex items-center justify-center relative">
                    <img
                      src={item.url}
                      alt={item.key}
                      className="max-h-full max-w-full object-contain"
                      loading="lazy"
                    />
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[10px] text-zinc-300">
                      {formatBytes(item.size)}
                    </span>
                  </div>

                  {/* Object Info */}
                  <div className="space-y-1">
                    <div className="text-xs font-mono font-medium text-zinc-200 truncate" title={item.key}>
                      {item.key}
                    </div>
                    {item.lastModified && (
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {new Date(item.lastModified).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyToClipboard(item.url, item.key)}
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition"
                    >
                      {copiedKey === item.key ? "Copied" : "Copy URL"}
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition"
                    >
                      View ↗
                    </a>
                  </div>

                  <button
                    onClick={() => handleDelete(item.key)}
                    disabled={deletePending}
                    className="px-2 py-1 rounded bg-red-950/40 hover:bg-red-900/60 text-red-400 text-[11px] transition disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

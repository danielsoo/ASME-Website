import { IKUpload } from "imagekitio-react";
import React, { useRef, useState } from "react";
import { Upload, CheckCircle } from "lucide-react";

type Props = {
  folder?: string;
  tags?: string[];
  fileName?: string;
  buttonLabel?: string;
  onComplete: (u: {
    url: string;
    fileId: string;
    filePath: string;
    thumbnailUrl: string | null;
    height?: number;
    width?: number;
    size?: number;
    name: string;
  }) => void;
  onProgress?: (pct: number) => void;
  onError?: (message: string) => void;
};

const imagekitPublicKey = (
  import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY ||
  (typeof process !== "undefined" ? process.env.IMAGEKIT_PUBLIC_KEY : undefined)
)?.trim();
const imagekitUrlEndpoint = (
  import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT ||
  (typeof process !== "undefined" ? process.env.IMAGEKIT_URL_ENDPOINT : undefined)
)?.trim();
/** Same-origin auth API (Vercel: api/imagekit-auth.js). Override with VITE_IMAGEKIT_AUTH_ENDPOINT if needed. */
const authEndpoint =
  (import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT as string | undefined)?.trim() ||
  "/api/imagekit-auth";
const isImageKitConfigured = Boolean(imagekitPublicKey && imagekitUrlEndpoint);

const Uploader: React.FC<Props> = ({
  folder,
  tags,
  fileName,
  buttonLabel = "Upload Image",
  onComplete,
  onProgress,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const authenticator = async () => {
    const resp = await fetch(authEndpoint, { credentials: "same-origin" });
    if (!resp.ok) {
      let detail = "";
      try {
        const j = (await resp.json()) as { error?: string };
        detail = j.error || "";
      } catch {
        detail = await resp.text();
      }
      throw new Error(
        detail || `ImageKit auth failed (HTTP ${resp.status}). Check IMAGEKIT_PRIVATE_KEY on the server.`
      );
    }
    return resp.json() as Promise<{
      signature: string;
      expire: number;
      token: string;
    }>;
  };

  const handleClick = () => {
    if (!isImageKitConfigured) {
      onError?.(
        "Image upload is not configured. Please set VITE_IMAGEKIT_PUBLIC_KEY and VITE_IMAGEKIT_URL_ENDPOINT, then redeploy."
      );
      return;
    }
    setDone(false);
    setProgress(0);
    fileInputRef.current?.click();
  };

  if (!isImageKitConfigured) {
    return (
      <div className="flex flex-col gap-2 text-sm text-amber-800">
        <p>
          Image upload is unavailable: set{" "}
          <code className="rounded bg-amber-100 px-1">VITE_IMAGEKIT_PUBLIC_KEY</code> and{" "}
          <code className="rounded bg-amber-100 px-1">VITE_IMAGEKIT_URL_ENDPOINT</code>{" "}
          in Vercel, then redeploy.
        </p>
        <button
          type="button"
          disabled
          className="inline-flex w-fit cursor-not-allowed items-center gap-2 rounded bg-gray-300 px-4 py-2 text-gray-600"
        >
          <Upload className="w-4 h-4" />
          {buttonLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <IKUpload
        ref={fileInputRef}
        fileName={fileName}
        folder={folder}
        tags={tags}
        useUniqueFileName
        authenticator={authenticator}
        style={{ display: "none" }}
        validateFile={(file: any) => {
          if (!file.type.startsWith("image/")) {
            onError?.("Only image files are allowed.");
            return false;
          }
          return true;
        }}
        onUploadStart={() => {
          setUploading(true);
          setDone(false);
          setProgress(0);
        }}
        onUploadProgress={(evt: any) => {
          const pct =
            evt.total && evt.total > 0
              ? Math.round((evt.loaded / evt.total) * 100)
              : 0;
          setProgress(pct);
          onProgress?.(pct);
        }}
        onSuccess={(result: any) => {
          setUploading(false);
          setDone(true);
          setProgress(100);
          onComplete({
            url: result.url,
            fileId: result.fileId,
            filePath: result.filePath,
            thumbnailUrl: result.thumbnailUrl ?? null,
            height: result.height,
            width: result.width,
            size: result.size,
            name: result.name,
          });
        }}
        onError={(err: any) => {
          setUploading(false);
          const rawMsg =
            (err as any)?.message ||
            (err as any)?.response?.data?.message ||
            "Upload failed";
          const msg = rawMsg.includes("Missing publicKey")
            ? "ImageKit public key is missing in this deployment. Check VITE_IMAGEKIT_PUBLIC_KEY and redeploy."
            : rawMsg;
          onError?.(msg);
        }}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
      >
        <Upload className="w-4 h-4" />
        {uploading ? `Uploading... ${progress}%` : buttonLabel}
      </button>

      {done && !uploading && (
        <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Uploaded
        </span>
      )}

      {uploading && (
        <div className="w-32">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Uploader;

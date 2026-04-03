import { IKUpload } from "imagekitio-react";
import { useRef, useState } from "react";
import React from "react";
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

const authEndpoint = import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT as string | undefined;

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
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);

  const authenticator = authEndpoint
    ? async () => {
        const resp = await fetch(authEndpoint);
        if (!resp.ok) throw new Error("ImageKit auth failed");
        return resp.json() as Promise<{ signature: string; expire: number; token: string }>;
      }
    : undefined;

  const handleClick = () => {
    setDone(false);
    setProgress(0);
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <IKUpload
        inputRef={fileInputRef}
        fileName={fileName}
        folder={folder}
        tags={tags}
        useUniqueFileName
        authenticator={authenticator}
        style={{ display: "none" }}
        validateFile={(file) => {
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
        onUploadProgress={(evt) => {
          const pct =
            evt.total && evt.total > 0
              ? Math.round((evt.loaded / evt.total) * 100)
              : 0;
          setProgress(pct);
          onProgress?.(pct);
        }}
        onSuccess={(result) => {
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
        onError={(err) => {
          setUploading(false);
          const msg =
            (err as any)?.message ||
            (err as any)?.response?.data?.message ||
            "Upload failed";
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

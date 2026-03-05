import { IKUpload } from "imagekitio-react";
import { useRef, useState } from "react";
import React from "react";

type Props = {
  folder?: string;
  tags?: string[];
  fileName?: string;
  buttonLabel?: string;
  onComplete: (u: any) => void;
  onProgress?: (pct: number) => void;
  onError?: (message: string) => void;
};

const Uploader: React.FC<Props> = ({
  folder,
  tags,
  fileName,
  buttonLabel = "Upload image",
  onComplete,
  onProgress,
  onError,
}) => {
  // Ref to the underlying <input type="file"> created by IKUpload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState<number>(0);

  return (
    <div>
      {/* Hide the default input and control it with our button */}
      <IKUpload
        inputRef={fileInputRef}
        fileName={fileName}
        folder={folder}
        tags={tags}
        useUniqueFileName
        style={{ display: "none" }}
        validateFile={(file) => {
          if (!file.type.startsWith("image/")) {
            onError?.("Only image files are allowed.");
            return false;
          }
          return true;
        }}
        onError={(err) => {
          const msg =
            (err && (err.message || err?.response?.data?.message)) ||
            "Upload failed";
          onError?.(msg);
        }}
        onSuccess={(result) => {
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
          setProgress(100);
        }}
        onUploadProgress={(evt) => {
          const pct =
            evt.total && evt.total > 0
              ? Math.round((evt.loaded / evt.total) * 100)
              : 0;
          setProgress(pct);
          onProgress?.(pct);
        }}
      />

      {/* Your visible button to open the file picker */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        {buttonLabel}
      </button>

      <div style={{ marginTop: 8 }}>
        Upload progress: <progress value={progress} max={100} />
      </div>
    </div>
  );
};

export default Uploader;
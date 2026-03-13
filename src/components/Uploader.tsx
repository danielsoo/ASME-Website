import { IKUpload } from "imagekitio-react";
import { useRef, useState } from "react";
import React from "react";

// NOTE::: fix this to actually work ; may need to add an API call somewhere in App.tsx or something

type Props = {
  folder?: string;
  tags?: string[];
  fileName?: string;
  buttonLabel?: string;
  onComplete: (u: any) => void;
  onProgress?: (pct: number) => void;
  onError?: (message: string) => void;
};

//styles
const ButtonStyle = {
  color: "white",
  fontWeight: "medium",
  backgroundColor: "oklch(54.6% 0.245 262.881)",
  padding: "10px",
  borderRadius: "0.25rem",
  margin: "8px",
  cursor: "pointer"
}
const ButtonHover = {
  color: "white",
  fontWeight: "medium",
  backgroundColor: "oklch(48.8% 0.243 264.376)",
  padding: "10px",
  borderRadius: "0.25rem",
  margin: "8px",
}

const LoadStyle = {
  color: "black",
  margin: "8px",

}

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

  const [isHovering, setIsHovering] = useState(false);

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  const currentStyle = isHovering ? { ...ButtonStyle, ...ButtonHover } : ButtonStyle;

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

      {/* Fix this to actually show up correctly */}
      <button
        style={currentStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        type="button"
        onClick={() => fileInputRef.current?.click()}
      >
        {buttonLabel}
      </button>

      <div style={LoadStyle}>
        Upload progress: <progress value={progress} max={100} />
      </div>
    </div>
  );
};

export default Uploader;
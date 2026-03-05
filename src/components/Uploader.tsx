import { IKUpload } from "imagekitio-react";
import { useRef, useState } from "react";
import { auth } from "../firebase/config";

type Props = {
    folder?: string;
    tags?: string[];
    fileName?: string;
    buttonLabel?: string;
    onComplete: (u: any) => void;
    onProgress?: (pct: number) => void;
    onError?: (message: string) => void;
}

// Uploader handles file uploading using ImageKit's React SDK.
export default function Uploader({
    folder,
    tags,
    fileName,
    buttonLabel = "Upload image",
    onComplete,
    onProgress,
    onError,
}: Props) {
    return (
        <IKUpload
            fileName={fileName}
            folder={folder}
            tags={tags}
            validateFile={(file) => {
                if (!file.type.startsWith("image/")) {
                    onError?.("Only image files are allowed.");
                    return false;
                }
                return true;
            }}
            onError={(err) => {
                const msg = 
                    (err && (err.message || err?.response?.data?.message)) || "Upload failed";
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
            }}
            onUploadProgress={(evt) => {
                const pct = 
                evt.total && evt.total > 0
                ? Math.round((evt.loaded / evt.total) * 100)
                : 0;
                onProgress?.(pct);
            }}
            useUniqueFileName
            /*declareUploadButton={(props: {onClick?: () => void; disabled?: boolean; loading?: boolean; label: string }) => {
                const { onClick, disabled, loading, label } = props;
                return (
                    <button
                    type="button"
                    className=""
                    onClick={onClick}
                    disabled={disabled||loading}
                    >{loading ? "Uploading...": label}</button>
                );
            }}*/

        />
    );
}
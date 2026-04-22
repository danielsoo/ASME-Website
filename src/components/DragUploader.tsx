import React, { useRef, useState, useCallback } from 'react';
import { Upload, CheckCircle } from 'lucide-react';

const imagekitPublicKey = (
  import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY ||
  (typeof process !== 'undefined' ? (process as any).env?.IMAGEKIT_PUBLIC_KEY : undefined)
)?.trim();

const authEndpoint =
  (import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT as string | undefined)?.trim() ||
  '/api/imagekit-auth';

const isConfigured = Boolean(imagekitPublicKey);

export type DragUploaderResult = {
  url: string;
  fileId: string;
  filePath: string;
  thumbnailUrl: string | null;
};

type Props = {
  folder?: string;
  tags?: string[];
  label?: string;
  accept?: string;
  allowedMimePrefixes?: string[];
  onComplete: (result: DragUploaderResult) => void;
  onProgress?: (pct: number) => void;
  onError?: (message: string) => void;
};

const DragUploader: React.FC<Props> = ({
  folder,
  tags,
  label,
  accept = 'image/*',
  allowedMimePrefixes = ['image/'],
  onComplete,
  onProgress,
  onError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const uploadFile = useCallback(async (file: File) => {
    if (!isConfigured) {
      onError?.('Image upload is not configured. Check VITE_IMAGEKIT_PUBLIC_KEY.');
      return;
    }
    const isAllowed = allowedMimePrefixes.some((prefix) => file.type.startsWith(prefix));
    if (!isAllowed) {
      onError?.(`Only ${allowedMimePrefixes.join(', ')} files are allowed.`);
      return;
    }

    setUploading(true);
    setDone(false);
    setProgress(0);

    try {
      const authResp = await fetch(authEndpoint, { credentials: 'same-origin' });
      if (!authResp.ok) {
        let detail = '';
        try { const j = await authResp.json() as { error?: string }; detail = j.error || ''; } catch { detail = await authResp.text(); }
        throw new Error(detail || `Auth failed (HTTP ${authResp.status})`);
      }
      const { signature, expire, token } = await authResp.json() as { signature: string; expire: number; token: string };

      const formData = new FormData();
      formData.append('file', file);
      formData.append('publicKey', imagekitPublicKey!);
      formData.append('signature', signature);
      formData.append('expire', String(expire));
      formData.append('token', token);
      formData.append('fileName', file.name);
      formData.append('useUniqueFileName', 'true');
      if (folder) formData.append('folder', folder);
      if (tags?.length) formData.append('tags', tags.join(','));

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
            onProgress?.(pct);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            let result: any;
            try { result = JSON.parse(xhr.responseText); } catch { reject(new Error('Invalid response from ImageKit')); return; }
            setDone(true);
            setUploading(false);
            onComplete({
              url: result.url,
              fileId: result.fileId,
              filePath: result.filePath,
              thumbnailUrl: result.thumbnailUrl ?? null,
            });
            resolve();
          } else {
            let msg = `Upload failed (${xhr.status})`;
            try { const r = JSON.parse(xhr.responseText); msg = r.message || r.error || msg; } catch { /* ignore */ }
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');
        xhr.send(formData);
      });
    } catch (err: any) {
      setUploading(false);
      onError?.(err.message || 'Upload failed');
    }
  }, [folder, tags, onComplete, onProgress, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }, [uploadFile]);

  if (!isConfigured) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-amber-700 text-sm">
        <Upload className="w-4 h-4 shrink-0" />
        Upload unavailable — set VITE_IMAGEKIT_PUBLIC_KEY and redeploy
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-4 transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
          uploading
            ? 'border-blue-300 bg-blue-50 cursor-not-allowed'
            : dragging
            ? 'border-blue-400 bg-blue-50 cursor-copy'
            : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
        }`}
      >
        {uploading ? (
          <div className="w-full flex flex-col items-center gap-2">
            <p className="text-sm text-blue-600 font-medium">Uploading... {progress}%</p>
            <div className="w-40 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : done ? (
          <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Uploaded
          </span>
        ) : (
          <>
            <Upload className={`w-5 h-5 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-sm text-gray-500 text-center leading-snug">
              {label ?? <>Drag & drop or <span className="text-blue-500 font-medium">click to upload</span></>}
            </p>
          </>
        )}
      </div>
    </>
  );
};

export default DragUploader;

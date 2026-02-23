// src/lib/imagekit.ts
import ImageKit from 'imagekit-javascript';
import { auth } from '../firebase/config';

export type IKAuthResponse = {
  token: string;
  expire: number;         // epoch seconds
  signature: string;
  publicKey: string;
  urlEndpoint: string;
  defaultFolder?: string; // e.g. "/projects" or `/users/<uid>`
};

type IKUploadResult = {
  url: string;
  fileId: string;
  filePath: string;
  thumbnailUrl?: string | null;
  height?: number;
  width?: number;
  size?: number;
  mime?: string;
  name?: string;
};


// Simple in-memory cache for auth params for the current tab
let cachedAuth: { data: IKAuthResponse; fetchedAt: number } | null = null;
const AUTH_TTL_MS = 2 * 60 * 1000; // 2 minutes (your function likely uses 5 min expiry)

/**
 * Fetch ImageKit auth params from your secured Firebase Function.
 * Requires the user to be signed in (uses Firebase ID token).
 */
export async function getImageKitAuth(): Promise<IKAuthResponse> {
  const now = Date.now();
  if (cachedAuth && now - cachedAuth.fetchedAt < AUTH_TTL_MS) {
    return cachedAuth.data;
  }

  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const idToken = await user.getIdToken();
  const endpoint = import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT;
  if (!endpoint) {
    throw new Error('VITE_IMAGEKIT_AUTH_ENDPOINT is not set');
  }

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to get ImageKit auth: ${res.status} ${body}`);
  }
  const data = (await res.json()) as IKAuthResponse;

  cachedAuth = { data, fetchedAt: now };
  return data;
}

/**
 * Upload a file to ImageKit. Returns normalized metadata you can store in Firestore.
 */
export async function uploadToImageKit(file: File, opts?: {
  folder?: string;     // override default folder
  tags?: string[];
  fileName?: string;   // default: file.name
}) {
  const { token, expire, signature, publicKey, urlEndpoint, defaultFolder } =
    await getImageKitAuth();

  const ik = new ImageKit({
    publicKey,
    urlEndpoint,
    // We pass token/signature/expire directly to upload()
  });

  const result = (await ik.upload({
    file,
    fileName: opts?.fileName || file.name,
    folder: opts?.folder ?? defaultFolder ?? '/projects',
    useUniqueFileName: true,
    tags: opts?.tags,
    token,
    signature,
    expire,
  })) as IKUploadResult;

  // Normalize what your Firestore schema stores
  return {
    url: result.url,
    fileId: result.fileId,
    filePath: result.filePath,           // e.g. /projects/abc.jpg
    thumbnailUrl: result.thumbnailUrl || null,
    height: result.height,
    width: result.width,
    size: result.size,
    mime: result.mime,
    name: result.name,
  };
}

/**
 * Build a transformed URL (handy when you only stored filePath).
 * You can also use <IKImage> in React instead of this.
 */
export async function buildImageUrl(path: string, transformation?: {
  width?: number;
  height?: number;
  crop?: 'maintain_ratio' | 'force' | 'at_least' | 'extract';
  focus?: 'auto' | 'face' | 'center';
  format?: 'webp' | 'jpg' | 'png' | 'avif';
}) {
  const { urlEndpoint } = await getImageKitAuth();
  const params: string[] = [];

  if (transformation?.width) params.push(`w-${transformation.width}`);
  if (transformation?.height) params.push(`h-${transformation.height}`);
  if (transformation?.crop) params.push(`c-${transformation.crop}`);
  if (transformation?.focus) params.push(`fo-${transformation.focus}`);
  if (transformation?.format) params.push(`f-${transformation.format}`);

  const tr = params.length ? `?tr=${params.join(',')}` : '';
  return `${urlEndpoint}${path}${tr}`;
}
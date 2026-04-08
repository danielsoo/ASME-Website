const authEndpoint =
  (import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT as string | undefined)?.trim() ||
  '/api/imagekit-auth';

const publicKey = (
  import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY ||
  (typeof process !== 'undefined' ? process.env.VITE_IMAGEKIT_PUBLIC_KEY : undefined)
)?.trim();

export async function uploadImageKitBlob(
  blob: Blob,
  fileName: string,
  opts: { folder?: string; tags?: string[] }
): Promise<{ url: string; filePath: string }> {
  if (!publicKey) {
    throw new Error('ImageKit public key is not configured.');
  }
  const authResp = await fetch(authEndpoint, { credentials: 'same-origin' });
  if (!authResp.ok) {
    const t = await authResp.text();
    throw new Error(t || `ImageKit auth failed (${authResp.status})`);
  }
  const auth = (await authResp.json()) as {
    signature: string;
    expire: number;
    token: string;
  };

  const form = new FormData();
  form.append('file', blob, fileName);
  form.append('fileName', fileName);
  form.append('publicKey', publicKey);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);
  form.append('useUniqueFileName', 'true');
  if (opts.folder) form.append('folder', opts.folder);
  if (opts.tags?.length) form.append('tags', opts.tags.join(','));

  const uploadResp = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: form,
  });
  if (!uploadResp.ok) {
    let detail = '';
    try {
      const j = (await uploadResp.json()) as { message?: string };
      detail = j.message || '';
    } catch {
      detail = await uploadResp.text();
    }
    throw new Error(detail || `Upload failed (HTTP ${uploadResp.status})`);
  }
  const result = (await uploadResp.json()) as { url: string; filePath: string };
  if (!result.url) {
    throw new Error('Upload response missing URL');
  }
  return { url: result.url, filePath: result.filePath };
}

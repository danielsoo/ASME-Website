/**
 * Vercel Serverless: ImageKit signed upload parameters for the browser client.
 *
 * Vercel env (server):
 * - IMAGEKIT_PRIVATE_KEY (do NOT use VITE_ prefix)
 * - VITE_IMAGEKIT_PUBLIC_KEY
 * - VITE_IMAGEKIT_URL_ENDPOINT
 */
import ImageKit from 'imagekit';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey =
    process.env.VITE_IMAGEKIT_PUBLIC_KEY || process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint =
    process.env.VITE_IMAGEKIT_URL_ENDPOINT || process.env.IMAGEKIT_URL_ENDPOINT;

  if (!privateKey || !publicKey || !urlEndpoint) {
    return res.status(500).json({
      error:
        'Missing server env: IMAGEKIT_PRIVATE_KEY, VITE_IMAGEKIT_PUBLIC_KEY, VITE_IMAGEKIT_URL_ENDPOINT',
    });
  }

  const imagekit = new ImageKit({
    publicKey: String(publicKey).trim(),
    privateKey: String(privateKey).trim(),
    urlEndpoint: String(urlEndpoint).trim().replace(/\/$/, ''),
  });

  const authParams = imagekit.getAuthenticationParameters();
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json(authParams);
}

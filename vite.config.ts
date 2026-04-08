import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import ImageKit from 'imagekit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        tailwindcss(),
        react(),
        {
          name: 'imagekit-auth-dev',
          configureServer(server) {
            server.middlewares.use('/api/imagekit-auth', (req, res, _next) => {
              if (req.method === 'OPTIONS') {
                res.statusCode = 204;
                res.end();
                return;
              }
              if (req.method !== 'GET' && req.method !== 'POST') {
                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Method not allowed' }));
                return;
              }
              const privateKey = env.IMAGEKIT_PRIVATE_KEY;
              const publicKey = env.VITE_IMAGEKIT_PUBLIC_KEY;
              const urlEndpoint = env.VITE_IMAGEKIT_URL_ENDPOINT;
              if (!privateKey || !publicKey || !urlEndpoint) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                  JSON.stringify({
                    error:
                      'Add IMAGEKIT_PRIVATE_KEY, VITE_IMAGEKIT_PUBLIC_KEY, VITE_IMAGEKIT_URL_ENDPOINT to .env.local',
                  })
                );
                return;
              }
              const ik = new ImageKit({
                publicKey: publicKey.trim(),
                privateKey: privateKey.trim(),
                urlEndpoint: urlEndpoint.trim().replace(/\/$/, ''),
              });
              const params = ik.getAuthenticationParameters();
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(params));
            });
          },
        },
      ],
      // Explicitly set public directory (default is 'public', but making it explicit)
      publicDir: 'public',
      define: {
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY),
        'process.env.IMAGEKIT_PUBLIC_KEY': JSON.stringify(env.VITE_IMAGEKIT_PUBLIC_KEY),
        'process.env.IMAGEKIT_URL_ENDPOINT': JSON.stringify(env.VITE_IMAGEKIT_URL_ENDPOINT)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'imagekit-javascript': path.resolve(__dirname, 'node_modules/@imagekit/javascript'),
        }
      },
    };
});

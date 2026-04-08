/**
 * Crops the on-screen frame region from the source image (natural pixels).
 * Uses fetch + createImageBitmap so canvas is not tainted by cross-origin CDN images.
 */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export async function cropFrameToSquareJpegBlob(
  imageUrl: string,
  displayRect: { offX: number; offY: number; dw: number; dh: number },
  frameLeft: number,
  frameTop: number,
  frameSize: number,
  outputSize = 512,
  jpegQuality = 0.92
): Promise<Blob> {
  if (frameSize <= 0) {
    throw new Error('Invalid frame for cropping.');
  }

  const res = await fetch(imageUrl, { mode: 'cors' });
  if (!res.ok) {
    throw new Error('Could not load image for cropping. Try again or re-upload the photo.');
  }
  const inputBlob = await res.blob();
  const bitmap = await createImageBitmap(inputBlob);

  const nw = bitmap.width;
  const nh = bitmap.height;
  if (!nw || !nh) {
    bitmap.close();
    throw new Error('Invalid image dimensions.');
  }

  const side = (frameSize / displayRect.dw) * nw;
  let sx = ((frameLeft - displayRect.offX) / displayRect.dw) * nw;
  let sy = ((frameTop - displayRect.offY) / displayRect.dh) * nh;
  sx = clamp(sx, 0, Math.max(0, nw - side));
  sy = clamp(sy, 0, Math.max(0, nh - side));

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas is not available.');
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, outputSize, outputSize);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (!b) reject(new Error('Failed to encode cropped image.'));
        else resolve(b);
      },
      'image/jpeg',
      jpegQuality
    );
  });
}

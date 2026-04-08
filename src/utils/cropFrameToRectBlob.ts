/**
 * Crops a rectangular region (display pixels → natural pixels) to JPEG.
 * Same coordinate model as cropFrameToSquareJpegBlob.
 */
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export async function cropFrameToRectJpegBlob(
  imageUrl: string,
  displayRect: { offX: number; offY: number; dw: number; dh: number },
  frameLeft: number,
  frameTop: number,
  frameWidth: number,
  frameHeight: number,
  outputWidth: number,
  outputHeight: number,
  jpegQuality = 0.92
): Promise<Blob> {
  if (frameWidth <= 0 || frameHeight <= 0) {
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

  const { offX, offY, dw, dh } = displayRect;
  let sx = ((frameLeft - offX) / dw) * nw;
  let sy = ((frameTop - offY) / dh) * nh;
  let sw = (frameWidth / dw) * nw;
  let sh = (frameHeight / dh) * nh;

  sx = clamp(sx, 0, Math.max(0, nw - 1));
  sy = clamp(sy, 0, Math.max(0, nh - 1));
  if (sx + sw > nw) sw = nw - sx;
  if (sy + sh > nh) sh = nh - sy;
  if (sw <= 0 || sh <= 0) {
    bitmap.close();
    throw new Error('Invalid crop region.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas is not available.');
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
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

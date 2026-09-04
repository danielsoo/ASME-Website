/**
 * Crops a rectangular region (display pixels → natural pixels) to JPEG.
 * Same coordinate model as cropFrameToSquareJpegBlob.
 *
 * The frame may extend beyond the source image's own bounds (the user
 * zoomed the crop frame out past the image to fit a tall/wide photo into a
 * mismatched target aspect without cropping content off). Any part of the
 * output canvas not covered by the image is filled with `backgroundColor`
 * instead of being stretched to hide the gap.
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
  jpegQuality = 0.92,
  backgroundColor = '#ffffff'
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
  // Full requested source rect, in natural-image pixels — may fall partly
  // or fully outside [0,nw] x [0,nh] when the frame was zoomed out past the
  // image's own edges.
  const reqSx = ((frameLeft - offX) / dw) * nw;
  const reqSy = ((frameTop - offY) / dh) * nh;
  const reqSw = (frameWidth / dw) * nw;
  const reqSh = (frameHeight / dh) * nh;
  if (reqSw <= 0 || reqSh <= 0) {
    bitmap.close();
    throw new Error('Invalid crop region.');
  }

  // Scale from natural-image pixels to output canvas pixels (uniform across
  // the whole requested rect, so the visible image portion isn't distorted).
  const scaleX = outputWidth / reqSw;
  const scaleY = outputHeight / reqSh;

  // Portion of the requested rect that's actually covered by the image.
  const visSx = clamp(reqSx, 0, nw);
  const visSy = clamp(reqSy, 0, nh);
  const visEndX = clamp(reqSx + reqSw, 0, nw);
  const visEndY = clamp(reqSy + reqSh, 0, nh);
  const visSw = Math.max(0, visEndX - visSx);
  const visSh = Math.max(0, visEndY - visSy);

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('Canvas is not available.');
  }

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  if (visSw > 0 && visSh > 0) {
    const destX = (visSx - reqSx) * scaleX;
    const destY = (visSy - reqSy) * scaleY;
    const destW = visSw * scaleX;
    const destH = visSh * scaleY;
    ctx.drawImage(bitmap, visSx, visSy, visSw, visSh, destX, destY, destW, destH);
  }
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

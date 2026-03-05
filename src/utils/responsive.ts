/**
 * Responsive size utility
 * Computes sizes based on 1512px and returns vw units
 */

const BASE_WIDTH = 1512;

/**
 * Compute vw from size based on 1512px
 * @param size - Size in pixels (at 1512px base)
 * @returns vw string (e.g. "4.23vw")
 */
export function responsiveSize(size: number): string {
  return `${(size / BASE_WIDTH) * 100}vw`;
}

/**
 * Compute clamp() from size based on 1512px
 * Min/max prevent too small or large values
 * @param size - Size in pixels (at 1512px base)
 * @param minSize - Min size in pixels (default: 50% of size)
 * @param maxSize - Max size in pixels (default: 150% of size)
 * @returns clamp() string (e.g. "clamp(32px, 4.23vw, 96px)")
 */
export function responsiveClamp(
  size: number,
  minSize?: number,
  maxSize?: number
): string {
  const min = minSize ?? size * 0.5;
  const max = maxSize ?? size * 1.5;
  const vw = (size / BASE_WIDTH) * 100;
  return `clamp(${min}px, ${vw}vw, ${max}px)`;
}

/**
 * Compute clamp() from size based on 1512px with custom min/max
 * @param size - Size in pixels (at 1512px base)
 * @param minSize - Min size in pixels
 * @param maxSize - Max size in pixels
 * @returns clamp() string
 */
export function responsiveClampCustom(
  size: number,
  minSize: number,
  maxSize: number
): string {
  const vw = (size / BASE_WIDTH) * 100;
  return `clamp(${minSize}px, ${vw}vw, ${maxSize}px)`;
}

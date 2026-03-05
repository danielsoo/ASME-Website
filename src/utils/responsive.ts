/**
 * 반응형 크기 계산 유틸리티
 * 1512px 기준으로 크기를 계산하여 vw 단위로 반환
 */

const BASE_WIDTH = 1512;

/**
 * 1512px 기준으로 크기를 계산하여 vw 단위로 반환
 * @param size - 1512px 기준 크기 (픽셀)
 * @returns vw 단위 문자열 (예: "4.23vw")
 */
export function responsiveSize(size: number): string {
  return `${(size / BASE_WIDTH) * 100}vw`;
}

/**
 * 1512px 기준으로 크기를 계산하여 clamp() 함수로 반환
 * 최소값, 최대값을 설정하여 너무 작거나 크게 되는 것을 방지
 * @param size - 1512px 기준 크기 (픽셀)
 * @param minSize - 최소 크기 (픽셀, 기본값: size의 50%)
 * @param maxSize - 최대 크기 (픽셀, 기본값: size의 150%)
 * @returns clamp() 문자열 (예: "clamp(32px, 4.23vw, 96px)")
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
 * 1512px 기준으로 크기를 계산하여 clamp() 함수로 반환 (커스텀 최소/최대값)
 * @param size - 1512px 기준 크기 (픽셀)
 * @param minSize - 최소 크기 (픽셀)
 * @param maxSize - 최대 크기 (픽셀)
 * @returns clamp() 문자열
 */
export function responsiveClampCustom(
  size: number,
  minSize: number,
  maxSize: number
): string {
  const vw = (size / BASE_WIDTH) * 100;
  return `clamp(${minSize}px, ${vw}vw, ${maxSize}px)`;
}

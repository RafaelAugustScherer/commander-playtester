/** How many creatures of a type it takes to get most of the way to a tribe's full bonus. */
export const TRIBAL_SATURATION = 3;

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** 0 at none, levelling off toward 1: about two thirds of the way there at `scale`. */
export function saturate(count: number, scale: number): number {
  return 1 - Math.exp(-count / scale);
}

/** 0 at or below `low`, 1 at or above `high`, and linear between. */
export function linearStep(value: number, low: number, high: number): number {
  return clamp01((value - low) / (high - low));
}

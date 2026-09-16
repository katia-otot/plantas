const TOP_REVEAL_PX = 8;
const MIN_DELTA_PX = 8;

/** Hide the top bar after scrolling down; show it again when scrolling up. */
export function shouldHideHeaderOnScroll({
  y,
  lastY,
  hidden,
  topReveal = TOP_REVEAL_PX,
  minDelta = MIN_DELTA_PX,
}: {
  y: number;
  lastY: number;
  hidden: boolean;
  topReveal?: number;
  minDelta?: number;
}): boolean {
  if (y <= topReveal) {
    return false;
  }

  const delta = y - lastY;
  if (delta > minDelta) {
    return true;
  }
  if (delta < -minDelta) {
    return false;
  }

  return hidden;
}

const MOBILE_BREAKPOINT = 880;
const DESKTOP_GAP = 16;
const MOBILE_GAP = 12;
const DESKTOP_COLLAPSE_DISTANCE = 72;
const MOBILE_COLLAPSE_DISTANCE = 56;
const DESKTOP_WIDTH_RATIO = 0.94;
const MOBILE_WIDTH_RATIO = 1;

export type FlexibleNavGeometryInput = {
  topBarBottom: number;
  staticTop: number;
  staticLeft: number;
  staticWidth: number;
  viewportWidth: number;
};

export type FlexibleNavGeometry = {
  anchorTop: number;
  progress: number;
  width: number;
  left: number;
  top: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

export function computeFlexibleNavGeometry({
  topBarBottom,
  staticTop,
  staticLeft,
  staticWidth,
  viewportWidth,
}: FlexibleNavGeometryInput): FlexibleNavGeometry {
  const isMobile = viewportWidth <= MOBILE_BREAKPOINT;
  const gap = isMobile ? MOBILE_GAP : DESKTOP_GAP;
  const collapseDistance = isMobile
    ? MOBILE_COLLAPSE_DISTANCE
    : DESKTOP_COLLAPSE_DISTANCE;
  const targetWidthRatio = isMobile ? MOBILE_WIDTH_RATIO : DESKTOP_WIDTH_RATIO;
  const anchorTop = topBarBottom + gap;
  const rawProgress = (anchorTop - staticTop) / collapseDistance;
  const progress = clamp(rawProgress, 0, 1);
  const eased = easeOutCubic(progress);
  const width = lerp(staticWidth, staticWidth * targetWidthRatio, eased);
  const left = staticLeft + (staticWidth - width) / 2;
  const top = lerp(staticTop, anchorTop, eased);

  return {
    anchorTop,
    progress,
    width,
    left,
    top,
  };
}

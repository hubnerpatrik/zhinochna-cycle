import { createSpringDriver, rubberband } from '../ui/motion.js';

export const ZOOM_MIN = 24;
export const ZOOM_MAX = 90;
const CHART_HEADER_HEIGHT = 28;
const TOUCH_DRAG_THRESHOLD = 8;
const STRETCH_RATIO = 0.25; // how far past a zoom limit a pinch can stretch, as a share of the limit
export const clampZoom = width => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, width));

// Labels stay fixed in size; only the day columns change width.
export function zoomScrollLeft(scrollLeft, anchorX, fixedWidth, oldWidth, newWidth) {
  const day = Math.max(0, (scrollLeft + anchorX - fixedWidth) / oldWidth);
  return Math.max(0, fixedWidth + day * newWidth - anchorX);
}

/**
 * Keep native one-finger scrolling and inertia. Intercept only two-finger zoom. Past either zoom limit the
 * pinch resists progressively, and on release the width springs back to the limit.
 */
export function bindMapGestures(element, { getWidth, setWidth, fixedWidth, onPinch = () => {}, clampWidth = clampZoom, getHeight = () => 0, now }) {
  let pinch = null;
  let firstTouch = null;
  let suppressClick = false;
  let frame = null;
  let pending = null;
  let anchor = { x: 0, y: 0 };   // where the last pinch was centred, kept while the width springs back
  const soft = raw => {
    const low = clampWidth(0);
    const high = clampWidth(Infinity);
    if (raw > high) return high + rubberband(raw - high, high * STRETCH_RATIO);
    if (raw < low) return low - rubberband(low - raw, low * STRETCH_RATIO);
    return raw;
  };
  const bounce = width => {
    const oldWidth = getWidth();
    const oldHeight = getHeight();
    const left = element.scrollLeft;
    const top = element.scrollTop;
    setWidth(width);
    element.scrollLeft = zoomScrollLeft(left, anchor.x, fixedWidth(), oldWidth, width);
    if (oldHeight) element.scrollTop = Math.max(0, (top + anchor.y - CHART_HEADER_HEIGHT) * getHeight() / oldHeight - anchor.y + CHART_HEADER_HEIGHT);
  };
  const springBack = createSpringDriver({ setOffset: bounce, now });
  const distance = touches => Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );
  const midpoint = touches => (touches[0].clientX + touches[1].clientX) / 2
    - element.getBoundingClientRect().left;

  function flush() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (!pending) return;
    const { width, left, height, top, anchorY, currentY } = pending;
    pending = null;
    setWidth(width);
    element.scrollLeft = left;
    if (height) element.scrollTop = Math.max(0, (top + anchorY - CHART_HEADER_HEIGHT) * getHeight() / height - currentY + CHART_HEADER_HEIGHT);
  }

  element.addEventListener("touchstart", event => {
    if (event.touches.length === 1) {
      firstTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      suppressClick = false;
    }
    if (event.touches.length !== 2) return;
    event.preventDefault();
    flush();
    springBack.stop();
    onPinch();
    suppressClick = true;
    pinch = {
      distance: Math.max(1, distance(event.touches)),
      width: getWidth(),
      left: element.scrollLeft,
      anchor: midpoint(event.touches),
      height: getHeight(),
      top: element.scrollTop,
      anchorY: (event.touches[0].clientY + event.touches[1].clientY) / 2 - element.getBoundingClientRect().top,
    };
  }, { passive: false });

  element.addEventListener("touchmove", event => {
    if (firstTouch && event.touches.length === 1
      && Math.hypot(event.touches[0].clientX - firstTouch.x,
        event.touches[0].clientY - firstTouch.y) > TOUCH_DRAG_THRESHOLD) suppressClick = true;
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const width = soft(pinch.width * distance(event.touches) / pinch.distance);
    anchor = { x: midpoint(event.touches), y: (event.touches[0].clientY + event.touches[1].clientY) / 2 - element.getBoundingClientRect().top };
    pending = {
      width,
      height: pinch.height, top: pinch.top, anchorY: pinch.anchorY,
      currentY: (event.touches[0].clientY + event.touches[1].clientY) / 2 - element.getBoundingClientRect().top,
      left: zoomScrollLeft(pinch.left, pinch.anchor, fixedWidth(), pinch.width, width)
        + pinch.anchor - midpoint(event.touches),
    };
    if (frame === null) frame = requestAnimationFrame(flush);
  }, { passive: false });

  const finish = event => {
    if (event.touches.length < 2) {
      flush();
      if (pinch) {
        const target = clampWidth(getWidth());
        if (target !== getWidth()) {
          springBack.show(getWidth());
          springBack.animateTo(target, 0);
        }
      }
      pinch = null;
    }
    if (!event.touches.length) firstTouch = null;
  };
  element.addEventListener("touchend", finish, { passive: true });
  element.addEventListener("touchcancel", finish, { passive: true });
  element.addEventListener("click", event => {
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
  }, true);
}

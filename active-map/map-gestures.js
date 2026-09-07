export const ZOOM_MIN = 24;
export const ZOOM_MAX = 90;
export const clampZoom = width => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, width));

// Labels stay fixed in size; only the day columns change width.
export function zoomScrollLeft(scrollLeft, anchorX, fixedWidth, oldWidth, newWidth) {
  const day = Math.max(0, (scrollLeft + anchorX - fixedWidth) / oldWidth);
  return Math.max(0, fixedWidth + day * newWidth - anchorX);
}

/** Keep native one-finger scrolling and inertia. Intercept only two-finger zoom. */
export function bindMapGestures(element, { getWidth, setWidth, fixedWidth, onPinch = () => {}, clampWidth = clampZoom, getHeight = () => 0 }) {
  let pinch = null;
  let firstTouch = null;
  let suppressClick = false;
  let frame = null;
  let pending = null;
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
    const { width, left, height, top, anchorY } = pending;
    pending = null;
    setWidth(width);
    element.scrollLeft = left;
    if (height) element.scrollTop = Math.max(0, (top + anchorY - 28) * getHeight() / height - anchorY + 28);
  }

  element.addEventListener("touchstart", event => {
    if (event.touches.length === 1) {
      firstTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      suppressClick = false;
    }
    if (event.touches.length !== 2) return;
    event.preventDefault();
    flush();
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
        event.touches[0].clientY - firstTouch.y) > 8) suppressClick = true;
    if (!pinch || event.touches.length !== 2) return;
    event.preventDefault();
    const width = clampWidth(pinch.width * distance(event.touches) / pinch.distance);
    pending = {
      width,
      height: pinch.height, top: pinch.top, anchorY: pinch.anchorY,
      left: zoomScrollLeft(pinch.left, pinch.anchor, fixedWidth(), pinch.width, width)
        + pinch.anchor - midpoint(event.touches),
    };
    if (frame === null) frame = requestAnimationFrame(flush);
  }, { passive: false });

  const finish = event => {
    if (event.touches.length < 2) {
      flush();
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

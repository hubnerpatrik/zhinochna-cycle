import { setText } from './i18n.js';
import { applyLayoutClass, setChartWidth } from './ui/layout-classes.js';
// chart.js — Canvas rendering and coverline interaction
// ─────────────────────────────────────────────
// Owns all draw* functions, renderChart, and handleCanvasClick.
// Draw order: bg → overlays → grid → annotations → data

import { store } from "./store.js";
import { LAYOUT, getElementById, chartY, chartPointY, isChartTemperature, chartLineY, chartGridY, tempSlotCount, graphHeight, chartWidth, pixelYToTemp } from "./core.js";
import { getCycleCoverlineValues, setCycleCoverlineValues } from "./domain.js";
import { MILLISECONDS_PER_DAY } from './date-utils.js';

const GRID_MAJOR_INTERVAL = 5;
const GRID_PIXEL_OFFSET = 0.5;
const DASH_PATTERN = [4, 4];
const FULL_CIRCLE_RADIANS = Math.PI * 2;
const MIN_LABEL_COLUMN_WIDTH = 24;
const COVERLINE_HIT_TOLERANCE = 10;
const COVERLINE_ENDPOINT_HIT_TOLERANCE = 13;
const ENDPOINT_OVERLAP_TOLERANCE = 0.5;
const DEFAULT_LINE_WIDTH = 1;
const EMPHASIZED_LINE_WIDTH = 2;
const ANNOTATION_LINE_WIDTH = 1.5;
const SELECTED_COVERLINE_WIDTH = 3;
const COVERLINE_SHADOW_BLUR = 5;
const COVERLINE_HANDLE_RADIUS = 5;
const PEAK_POINT_RADIUS = 7;
const INFLUENCE_POINT_RADIUS = 9;
const TEMPERATURE_POINT_RADIUS = 4;
const MAX_CROSS_INSET_X = 7;
const CROSS_INSET_X_RATIO = 0.22;
const MAX_CROSS_INSET_Y = 4;
const CROSS_INSET_Y_RATIO = 0.3;
const OVERFLOW_HALF_WIDTH = 5;
const OVERFLOW_HEIGHT = 8;
const OVERFLOW_LABEL_OFFSET = 23;
const MEASUREMENT_TIME_OFFSET = 18;
const OVERFLOW_MARKER_OFFSET = 38;
const MARKER_TOP_THRESHOLD = 30;
const MARKER_OFFSET_BELOW = 20;
const MARKER_OFFSET_ABOVE = 14;
const TEMPERATURE_PRECISION_FACTOR = 100;
const TEMPERATURE_DECIMAL_PLACES = 2;

function beginCoverlinePath(context, selected) {
  context.beginPath();
  context.setLineDash([]);
  context.strokeStyle = selected ? 'rgba(180,20,20,1)' : 'rgba(180,20,20,0.8)';
  context.lineWidth = selected ? SELECTED_COVERLINE_WIDTH : ANNOTATION_LINE_WIDTH;
  context.shadowColor = selected ? 'rgba(180,20,20,0.35)' : 'transparent';
  context.shadowBlur = selected ? COVERLINE_SHADOW_BLUR : 0;
}

function resetCoverlinePath(context) {
  context.setLineDash([]);
  context.shadowColor = 'transparent';
  context.shadowBlur = 0;
  context.lineWidth = DEFAULT_LINE_WIDTH;
}

function coverlineColumnX(column, position = "start") {
  if (position === "center") return column.centerX ?? column.x + LAYOUT.columnWidth / 2;
  if (position === "end") return column.x + LAYOUT.columnWidth;
  return column.x;
}

function coverlineAnchorX(values, keyField, positionField, columns, fallback = null) {
  const column = columns.find(item => item.key === values[keyField]);
  return column ? coverlineColumnX(column, values[positionField]) : fallback;
}

function getCoverlineGeometry(columns) {
  const values = getCycleCoverlineValues();
  const width = chartWidth(columns);
  const horizontalY = values.horizontalTemp == null ? null : chartLineY(values.horizontalTemp);
  const verticalX = coverlineAnchorX(values, "verticalKey", "verticalPosition", columns);

  return {
    horizontal: horizontalY == null ? null : {
      startX: coverlineAnchorX(
        values,
        "horizontalStartKey",
        "horizontalStartPosition",
        columns,
        verticalX ?? 0,
      ),
      endX: coverlineAnchorX(
        values,
        "horizontalEndKey",
        "horizontalEndPosition",
        columns,
        width,
      ),
      y: horizontalY,
    },
    vertical: verticalX == null ? null : {
      x: verticalX,
      topY: values.verticalTopTemp == null
        ? LAYOUT.chartPaddingTop
        : chartLineY(values.verticalTopTemp),
      bottomY: values.verticalBottomTemp == null
        ? horizontalY ?? LAYOUT.chartHeight - LAYOUT.chartPaddingBottom
        : chartLineY(values.verticalBottomTemp),
    },
  };
}

function drawCoverlineHandle(context, x, y) {
  if (typeof context.arc !== "function" || typeof context.fill !== "function") return;
  context.beginPath();
  context.setLineDash([]);
  context.fillStyle = "white";
  context.strokeStyle = "rgba(180,20,20,1)";
  context.lineWidth = EMPHASIZED_LINE_WIDTH;
  context.arc(x, y, COVERLINE_HANDLE_RADIUS, 0, FULL_CIRCLE_RADIANS);
  context.fill();
  context.stroke();
}

/* ─── cycle grouping ──────────────────────── */

/** Groups columns by cycleId — used to draw temperature lines per cycle. */
export function groupColumnsByCycle(columns) {
  const groups = [];
  columns.forEach(column => {
    const lastGroup = groups[groups.length - 1];
    if (!lastGroup || lastGroup.id !== column.cycleId) {
      groups.push({ id: column.cycleId, columns: [column] });
      return;
    }
    lastGroup.columns.push(column);
  });
  return groups;
}

/* ─── grid ────────────────────────────────── */
/** Draws vertical column separators. Every 5th line is darker. */
export function drawVerticalGrid(context, columns) {
  columns.forEach(column => {
    const x = Math.round(column.x) + GRID_PIXEL_OFFSET;
    context.beginPath();
    context.lineWidth = DEFAULT_LINE_WIDTH;
    context.strokeStyle = column.index % GRID_MAJOR_INTERVAL === 0 ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.10)";
    context.moveTo(x, LAYOUT.chartPaddingTop);
    context.lineTo(x, LAYOUT.chartHeight - LAYOUT.chartPaddingBottom);
    context.stroke();
  });
  const lastX = chartWidth(columns) + GRID_PIXEL_OFFSET;
  context.beginPath();
  context.lineWidth = DEFAULT_LINE_WIDTH;
  context.strokeStyle = "rgba(0,0,0,0.30)";
  context.moveTo(lastX, LAYOUT.chartPaddingTop);
  context.lineTo(lastX, LAYOUT.chartHeight - LAYOUT.chartPaddingBottom);
  context.stroke();
  context.lineWidth = DEFAULT_LINE_WIDTH;
}

/** Draws horizontal temperature grid lines — one per 0.05°C cell boundary. Every 5th line is darker. */
export function drawHorizontalGrid(context, canvasWidth) {
  const slots = tempSlotCount();
  for (let index = 0; index <= slots; index++) {
    const y = Math.floor(chartGridY(index)) + GRID_PIXEL_OFFSET;
    context.beginPath();
    context.lineWidth = DEFAULT_LINE_WIDTH;
    context.strokeStyle = index % GRID_MAJOR_INTERVAL === 0 ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.10)";
    context.moveTo(0, y);
    context.lineTo(canvasWidth, y);
    context.stroke();
  }
  context.lineWidth = DEFAULT_LINE_WIDTH;
}

/** Draws the manually placed vertical coverline with independently resizable endpoints. */
export function drawVerticalCoverline(context, columns, selected = false) {
  const { vertical } = getCoverlineGeometry(columns);
  if (!vertical) return;

  beginCoverlinePath(context, selected);

  context.moveTo(vertical.x, vertical.topY);
  context.lineTo(vertical.x, vertical.bottomY);

  context.stroke();
  if (selected) {
    drawCoverlineHandle(context, vertical.x, vertical.topY);
    drawCoverlineHandle(context, vertical.x, vertical.bottomY);
  }

  resetCoverlinePath(context);
}

/** Draws the manually placed horizontal coverline with independently resizable endpoints. */
export function drawHorizontalCoverline(context, columns, selected = false) {
  const { horizontal } = getCoverlineGeometry(columns);
  if (!horizontal) return;

  beginCoverlinePath(context, selected);

  context.moveTo(horizontal.startX, horizontal.y);
  context.lineTo(horizontal.endX, horizontal.y);

  context.stroke();
  if (selected) {
    drawCoverlineHandle(context, horizontal.startX, horizontal.y);
    drawCoverlineHandle(context, horizontal.endX, horizontal.y);
  }

  resetCoverlinePath(context);
}

/* ─── overlays ────────────────────────────── */

/** Fills day columns with optional color overlays. */
export function drawOverlayBands(context, columns) {
  columns.forEach(column => {
    if (!column.isFertile) return;
    context.fillStyle = "rgba(207,231,180,0.28)";
    context.fillRect(
      column.x,
      LAYOUT.chartPaddingTop,
      LAYOUT.columnWidth,
      LAYOUT.chartHeight - LAYOUT.chartPaddingTop - LAYOUT.chartPaddingBottom,
    );
  });
}

/** Draws an ascending diagonal inside every chart grid cell marked by the user. */
export function drawCrossedChartCells(context, columns) {
  columns.forEach(column => {
    const temps = store.crossCellSelectionMode
      ? store.crossCellDraft?.[column.key]
      : store.entries[column.key]?.crossedChartTemps;
    if (!Array.isArray(temps)) return;

    temps.forEach(temp => {
      const centerY = chartY(temp);
      const insetX = Math.min(MAX_CROSS_INSET_X, LAYOUT.columnWidth * CROSS_INSET_X_RATIO);
      const cellHalfHeight = graphHeight() / tempSlotCount() / 2;
      const insetY = Math.min(MAX_CROSS_INSET_Y, cellHalfHeight * CROSS_INSET_Y_RATIO);
      const left = column.x + insetX;
      const right = column.x + LAYOUT.columnWidth - insetX;

      context.beginPath();
      context.strokeStyle = "rgba(22,163,74,0.78)";
      context.lineWidth = ANNOTATION_LINE_WIDTH;
      context.moveTo(left, centerY + cellHalfHeight - insetY);
      context.lineTo(right, centerY - cellHalfHeight + insetY);
      context.stroke();
    });
  });
  context.lineWidth = DEFAULT_LINE_WIDTH;
}

/** Highlights the currently selected column. */
export function drawSelectedHighlight(context, columns) {
  if (!store.selectedKey) return;
  const column = columns.find(candidate => candidate.key === store.selectedKey);
  if (!column) return;
  context.fillStyle = "rgba(37,99,235,0.08)";
  context.fillRect(column.x, 0, LAYOUT.columnWidth, LAYOUT.chartHeight);
}

/** Draws a vertical hover line on the currently hovered column. */
export function drawHoverLine(context, columns) {
  if (!store.hoveredKey) return;
  const column = columns.find(candidate => candidate.key === store.hoveredKey);
  if (!column) return;
  context.beginPath();
  context.strokeStyle = "rgba(37,99,235,0.45)";
  context.moveTo(column.centerX, 0);
  context.lineTo(column.centerX, LAYOUT.chartHeight);
  context.stroke();
}

/** Draws vertical separators between cycle groups. */
export function drawCycleSeparators(context, cycleGroups) {
  cycleGroups.slice(1).forEach(group => {
    const x = group.columns[0].x - GRID_PIXEL_OFFSET;
    context.beginPath();
    context.setLineDash([]);
    context.strokeStyle = "#b41414";
    context.lineWidth = EMPHASIZED_LINE_WIDTH;
    context.moveTo(x, 0);
    context.lineTo(x, LAYOUT.chartHeight);
    context.stroke();
  });
}

/* ─── temperature data ────────────────────── */

/** Draws the temperature line — one path per cycle group to avoid cross-cycle connections. */
export function drawTemperatureLine(context, cycleGroups) {
  cycleGroups.forEach(group => {
    const valid = group.columns.filter(candidate => candidate.temp != null);
    if (valid.length < 2) return;

    context.strokeStyle = "#111";
    context.lineWidth = EMPHASIZED_LINE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";

    valid.forEach((column, index) => {
      if (index === 0) return;
      const previousColumn = valid[index - 1];
      // An out-of-scale reading is explicitly labelled, never joined as a normal point.
      if (!isChartTemperature(previousColumn.temp) || !isChartTemperature(column.temp)) return;
      const previousY = chartY(previousColumn.temp);
      const columnY = chartY(column.temp);

      const daysBetween = (column.date - previousColumn.date) / MILLISECONDS_PER_DAY;

      context.beginPath();
      context.moveTo(previousColumn.centerX, previousY);
      context.lineTo(column.centerX, columnY);
      context.setLineDash(daysBetween > 1 ? DASH_PATTERN : []);
      context.stroke();
    });

    context.setLineDash([]);
  });
  context.lineWidth = DEFAULT_LINE_WIDTH;
}

/** Draws a dot at each temperature reading. Selected day dot is highlighted in blue. If influence factors are present, a larger red dot is drawn. */
export function drawTemperaturePoints(context, columns) {
  columns.forEach(column => {
    if (column.temp == null) return;

    const pointY = chartPointY(column.temp);
    if (!isChartTemperature(column.temp)) {
      drawOverflowTemperature(context, column, column.temp, '#b43c45');
      return;
    }
    const markerY = column.markers?.bbt?.pointType === "adjusted" && column.adjustedTemp != null
      ? chartPointY(column.adjustedTemp)
      : pointY;

    if (column.isPeak) {
      context.beginPath();
      context.arc(column.centerX, markerY, PEAK_POINT_RADIUS, 0, FULL_CIRCLE_RADIANS);
      context.strokeStyle = "rgba(22,163,74,0.75)";
      context.lineWidth = EMPHASIZED_LINE_WIDTH;
      context.stroke();
    }

    const hasFactors = Boolean(column.tempFactors?.trim());

    if (hasFactors) {
      context.beginPath();
      context.arc(column.centerX, pointY, INFLUENCE_POINT_RADIUS, 0, FULL_CIRCLE_RADIANS);
      context.strokeStyle = "#ff0000";
      context.lineWidth = EMPHASIZED_LINE_WIDTH;
      context.stroke();
    }

    context.beginPath();
    context.arc(column.centerX, pointY, TEMPERATURE_POINT_RADIUS, 0, FULL_CIRCLE_RADIANS);
    context.fillStyle = "#111";
    context.fill();
  });

  context.lineWidth = DEFAULT_LINE_WIDTH;
}

function drawOverflowTemperature(context, column, temp, color) {
  const y = chartPointY(temp);
  const direction = temp > LAYOUT.maxTemp ? 1 : -1;
  context.beginPath();
  context.moveTo(column.centerX, y);
  context.lineTo(column.centerX - OVERFLOW_HALF_WIDTH, y + direction * OVERFLOW_HEIGHT);
  context.lineTo(column.centerX + OVERFLOW_HALF_WIDTH, y + direction * OVERFLOW_HEIGHT);
  context.closePath();
  context.fillStyle = color;
  context.fill();
  if (LAYOUT.columnWidth >= MIN_LABEL_COLUMN_WIDTH || column.key === store.selectedKey) {
    context.font = 'bold 10px Inter';
    context.textAlign = 'center';
    context.fillText(`${temp.toFixed(TEMPERATURE_DECIMAL_PLACES)}°`, column.centerX, y + direction * OVERFLOW_LABEL_OFFSET);
  }
}

/** Draws a secondary dot for the time-adjusted temperature — connects it to the measured point with a dashed blue line. */
export function drawAdjustedTemperaturePoints(context, columns) {
  columns.forEach(column => {
    if (column.adjustedTemp == null || column.temp == null) return;
    // When the measurement itself overflows, its actual value takes precedence.
    if (!isChartTemperature(column.temp)) return;
    if (!isChartTemperature(column.adjustedTemp)) {
      drawOverflowTemperature(context, column, column.adjustedTemp, '#2563eb');
      return;
    }

    const baseY = chartY(column.temp);
    const adjustedY = chartY(column.adjustedTemp);

    context.beginPath();
    context.setLineDash(DASH_PATTERN);
    context.strokeStyle = "#2563eb";
    context.lineWidth = ANNOTATION_LINE_WIDTH;
    context.moveTo(column.centerX, baseY);
    context.lineTo(column.centerX, adjustedY);
    context.stroke();

    context.setLineDash([]);
    context.beginPath();
    context.arc(column.centerX, adjustedY, TEMPERATURE_POINT_RADIUS, 0, FULL_CIRCLE_RADIANS);
    context.fillStyle = "#2563eb";
    context.fill();
  });

  context.lineWidth = DEFAULT_LINE_WIDTH;
}

/** Draws the measurement time label under a temperature dot, when set. */
export function drawMeasurementTimes(context, columns) {
  columns.forEach(column => {
    if (LAYOUT.columnWidth < MIN_LABEL_COLUMN_WIDTH && column.key !== store.selectedKey) return;
    if (column.temp == null || !column.measurementTime) return;
    if (!isChartTemperature(column.temp)) return;
    const pointY = chartY(column.temp);
    context.font = "10px Inter";
    context.fillStyle = "#8e8e93";
    context.textAlign = "center";
    context.fillText(column.measurementTime, column.centerX, pointY + MEASUREMENT_TIME_OFFSET);
  });
}
/** Draws anomaly marker labels above (or below, if that would overlap the other dot) the anchor temperature dot. */
export function drawMarkers(context, columns) {
  columns.forEach(column => {
    const marker = column.markers?.bbt;
    if (column.temp == null || !marker?.value) return;

    const usingAdjusted = marker.pointType === "adjusted" && column.adjustedTemp != null;
    const markerY = usingAdjusted ? chartPointY(column.adjustedTemp) : chartPointY(column.temp);

    // flip label below the dot when the anchor sits lower than its counterpart, to avoid overlapping it
    let labelBelow = false;
    if (column.adjustedTemp != null) {
      const tempY = chartY(column.temp);
      const adjustedY = chartY(column.adjustedTemp);
      labelBelow = usingAdjusted ? adjustedY > tempY : tempY > adjustedY;
    }

    context.font = "bold 14px Inter";
    context.fillStyle = "#16a34a";
    context.textAlign = "center";
    const markerTemp = usingAdjusted ? column.adjustedTemp : column.temp;
    const labelY = !isChartTemperature(markerTemp)
      ? markerY + (markerTemp > LAYOUT.maxTemp ? OVERFLOW_MARKER_OFFSET : -OVERFLOW_MARKER_OFFSET)
      : markerY < MARKER_TOP_THRESHOLD || labelBelow ? markerY + MARKER_OFFSET_BELOW : markerY - MARKER_OFFSET_ABOVE;
    context.fillText(marker.value, column.centerX, labelY);
  });
}

/* ─── render ──────────────────────────────── */

/** Main chart render — sets up canvas, scales for DPR, and runs the full draw pipeline. */
export function renderChart(columns, { coverlineSelected = false } = {}) {
  const canvas = getElementById("tempChart");
  if (!canvas) return;

  const width = chartWidth(columns);
  const pixelRatio = window.devicePixelRatio || 1;
  const context = canvas.getContext("2d");
  const cycleGroups = groupColumnsByCycle(columns);

  setChartWidth(canvas, width);
  applyLayoutClass(canvas, 'chart-height', { '--rendered-chart-height': LAYOUT.chartHeight });
  canvas.classList.toggle("cross-cell-selection-mode", store.crossCellSelectionMode);
  canvas.width        = width * pixelRatio;
  canvas.height       = LAYOUT.chartHeight * pixelRatio;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(pixelRatio, pixelRatio);
  context.clearRect(0, 0, width, LAYOUT.chartHeight);

  // draw order matters: bg → overlays → grid → annotations → data
  drawSelectedHighlight(context, columns);
  drawOverlayBands(context, columns);
  drawVerticalGrid(context, columns);
  drawHorizontalGrid(context, width);
  drawCrossedChartCells(context, columns);
  drawCycleSeparators(context, cycleGroups);
  drawHoverLine(context, columns);
  drawHorizontalCoverline(context, columns, coverlineSelected);
  drawVerticalCoverline(context, columns, coverlineSelected);
  drawTemperatureLine(context, cycleGroups);
  drawTemperaturePoints(context, columns);
  drawAdjustedTemperaturePoints(context, columns);

  drawMeasurementTimes(context, columns);
  drawMarkers(context, columns);
}

/* ─── coverline interaction ───────────────── */

/** Returns a coverline body or endpoint at a chart position. Endpoints take priority. */
export function getCoverlineDragTarget(x, y, columns, tolerance = COVERLINE_HIT_TOLERANCE) {
  const geometry = getCoverlineGeometry(columns);
  const endpoints = [];
  if (geometry.horizontal) {
    endpoints.push(
      { target: "horizontal-start", axis: "horizontal", x: geometry.horizontal.startX, y: geometry.horizontal.y },
      { target: "horizontal-end", axis: "horizontal", x: geometry.horizontal.endX, y: geometry.horizontal.y },
    );
  }
  if (geometry.vertical) {
    endpoints.push(
      { target: "vertical-top", axis: "vertical", x: geometry.vertical.x, y: geometry.vertical.topY },
      { target: "vertical-bottom", axis: "vertical", x: geometry.vertical.x, y: geometry.vertical.bottomY },
    );
  }

  const endpointHits = endpoints
    .map(endpoint => ({ ...endpoint, distance: Math.hypot(x - endpoint.x, y - endpoint.y) }))
    .filter(endpoint => endpoint.distance <= COVERLINE_ENDPOINT_HIT_TOLERANCE)
    .sort((a, b) => a.distance - b.distance);
  if (endpointHits.length) {
    const nearest = endpointHits[0];
    const overlapping = endpointHits.filter(endpoint =>
      Math.abs(endpoint.x - nearest.x) < ENDPOINT_OVERLAP_TOLERANCE && Math.abs(endpoint.y - nearest.y) < ENDPOINT_OVERLAP_TOLERANCE);
    if (overlapping.length > 1) {
      const preferredAxis = Math.abs(x - nearest.x) >= Math.abs(y - nearest.y)
        ? "horizontal"
        : "vertical";
      return overlapping.find(endpoint => endpoint.axis === preferredAxis)?.target ?? nearest.target;
    }
    return nearest.target;
  }

  const horizontalHit = geometry.horizontal
    && x >= Math.min(geometry.horizontal.startX, geometry.horizontal.endX) - tolerance
    && x <= Math.max(geometry.horizontal.startX, geometry.horizontal.endX) + tolerance
    && Math.abs(y - geometry.horizontal.y) <= tolerance;
  const verticalHit = geometry.vertical
    && y >= Math.min(geometry.vertical.topY, geometry.vertical.bottomY) - tolerance
    && y <= Math.max(geometry.vertical.topY, geometry.vertical.bottomY) + tolerance
    && Math.abs(x - geometry.vertical.x) <= tolerance;

  if (horizontalHit && verticalHit) {
    return Math.abs(y - geometry.horizontal.y) <= Math.abs(x - geometry.vertical.x)
      ? "horizontal"
      : "vertical";
  }
  if (horizontalHit) return "horizontal";
  if (verticalHit) return "vertical";
  return null;
}

function pixelXToCoverlineAnchor(x, columns) {
  if (!columns.length) return null;

  const anchors = columns.flatMap(column => [
    { key: column.key, position: "start", x: coverlineColumnX(column, "start") },
    { key: column.key, position: "center", x: coverlineColumnX(column, "center") },
  ]);
  const lastColumn = columns.at(-1);
  anchors.push({
    key: lastColumn.key,
    position: "end",
    x: coverlineColumnX(lastColumn, "end"),
  });

  return anchors.reduce((closest, anchor) =>
    Math.abs(x - anchor.x) < Math.abs(x - closest.x) ? anchor : closest);
}

function coverlineTempFromY(y, allowTopBoundary = false) {
  const maximum = Math.round(
    (LAYOUT.maxTemp + (allowTopBoundary ? LAYOUT.tempStep : 0)) * TEMPERATURE_PRECISION_FACTOR,
  ) / TEMPERATURE_PRECISION_FACTOR;
  return Math.min(maximum, Math.max(LAYOUT.minTemp, pixelYToTemp(y)));
}

/** Moves a coverline body or resizes one endpoint independently. */
export function updateCoverlineDrag(target, x, y, columns) {
  const values = {};

  if (target === "horizontal") {
    values.horizontalTemp = coverlineTempFromY(y);
  }

  if (target === "vertical") {
    const anchor = pixelXToCoverlineAnchor(x, columns);
    if (anchor) {
      values.verticalKey = anchor.key;
      values.verticalPosition = anchor.position;
    }
  }

  if (target === "horizontal-start" || target === "horizontal-end") {
    const anchor = pixelXToCoverlineAnchor(x, columns);
    const prefix = target === "horizontal-start" ? "horizontalStart" : "horizontalEnd";
    if (anchor) {
      values[`${prefix}Key`] = anchor.key;
      values[`${prefix}Position`] = anchor.position;
    }
  }

  if (target === "vertical-top" || target === "vertical-bottom") {
    const field = target === "vertical-top" ? "verticalTopTemp" : "verticalBottomTemp";
    values[field] = coverlineTempFromY(y, true);
  }

  if (!Object.keys(values).length) return false;
  setCycleCoverlineValues(values);
  return true;
}

/** Places both lines as an initial L; every endpoint can then be moved independently. */
export function placeCoverlinesAt(x, y, columns) {
  const anchor = pixelXToCoverlineAnchor(x, columns);
  if (!anchor) return false;
  const lastColumn = columns.at(-1);
  const temp = coverlineTempFromY(y);

  setCycleCoverlineValues({
    horizontalTemp: temp,
    horizontalStartKey: anchor.key,
    horizontalStartPosition: anchor.position,
    horizontalEndKey: lastColumn.key,
    horizontalEndPosition: "end",
    verticalKey: anchor.key,
    verticalPosition: anchor.position,
    verticalTopTemp: Math.round((LAYOUT.maxTemp + LAYOUT.tempStep) * TEMPERATURE_PRECISION_FACTOR) / TEMPERATURE_PRECISION_FACTOR,
    verticalBottomTemp: temp,
  });
  return true;
}

/**
 * Handles canvas clicks when a coverline mode is active.
 * Snaps the clicked temperature to the nearest 0.05°C step.
 * Deactivates coverline mode after placement.
 */
export function handleCanvasClick(x, y, columns) {
  if (!store.horizontalCoverlineMode && !store.verticalCoverlineMode) {
    return;
  }

  if (!placeCoverlinesAt(x, y, columns)) return false;

  store.horizontalCoverlineMode = false;
  store.verticalCoverlineMode = false;

  const coverlineButton = getElementById("coverlineBtn");
  if (coverlineButton) {
    coverlineButton.classList.remove("active");
    setText(coverlineButton, "Coverlines");
    coverlineButton.setAttribute("aria-pressed", "false");
  }
  return true;
}

/**
 * Builds a smooth monotone cubic Bezier SVG path through plotted points,
 * clamping tangents via Fritsch-Carlson so curves never overshoot or dip below 0.
 */
export const buildSmoothLinePath = (points) => {
  if (!Array.isArray(points) || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  const n = points.length;
  const slopes = [];
  for (let i = 0; i < n - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x || 1;
    slopes.push((points[i + 1].y - points[i].y) / dx);
  }

  const tangents = new Array(n).fill(0);
  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i += 1) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i += 1) {
    const s = slopes[i];
    if (s === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / s;
      const b = tangents[i + 1] / s;
      const h = Math.hypot(a, b);
      if (h > 3) {
        const scale = 3 / h;
        tangents[i] = scale * a * s;
        tangents[i + 1] = scale * b * s;
      }
    }
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) / 3;
    const cp1x = p0.x + dx;
    const cp1y = p0.y + tangents[i] * dx;
    const cp2x = p1.x - dx;
    const cp2y = p1.y - tangents[i + 1] * dx;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  return d;
};

/**
 * charts.js — hand-rolled SVG chart renderers.
 * Lightweight, deterministic, mint-themed. All respect prefers-reduced-motion.
 *
 * window.PFC_CHARTS.{areaChart, sparkline, donut, progressRing, barChart}
 */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const reduced = () =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, attrs = {}) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }

  function fmt(n, opts = {}) {
    if (window.PFC_MOTION) return window.PFC_MOTION.formatNumber(n, opts);
    return String(n);
  }

  // Catmull-Rom → bezier smoothing for area/line charts.
  function smoothPath(points) {
    if (points.length < 2) return "";
    let d = `M ${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  function clearChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  // ---------- areaChart ----------
  function areaChart(container, data, opts = {}) {
    if (!container || !data || !data.length) return;
    const {
      height = 240,
      padding = { top: 16, right: 12, bottom: 28, left: 12 },
      currency,
      showAxis = true,
      gradientId = "pfc-area-grad-" + Math.random().toString(36).slice(2, 7),
      lineColor = "var(--mint-400)",
      fillFromColor = "var(--mint-500)",
    } = opts;

    clearChildren(container);
    const width = container.clientWidth || 600;
    const svg = el("svg", {
      viewBox: `0 0 ${width} ${height}`,
      width: "100%",
      height: String(height),
      role: "img",
      "aria-label": opts.ariaLabel || "Trend chart",
    });

    const values = data.map((d) => (typeof d === "number" ? d : d.value));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;
    const stepX = innerW / Math.max(1, values.length - 1);

    const pts = values.map((v, i) => [
      padding.left + i * stepX,
      padding.top + innerH - ((v - min) / range) * innerH,
    ]);

    // Gradient
    const defs = el("defs");
    const grad = el("linearGradient", { id: gradientId, x1: "0", x2: "0", y1: "0", y2: "1" });
    grad.appendChild(el("stop", { offset: "0%", "stop-color": fillFromColor, "stop-opacity": "0.45" }));
    grad.appendChild(el("stop", { offset: "100%", "stop-color": fillFromColor, "stop-opacity": "0" }));
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Gridlines (subtle, 4 horizontal)
    if (showAxis) {
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (innerH / 4) * i;
        svg.appendChild(el("line", {
          x1: padding.left, x2: width - padding.right, y1: y, y2: y,
          stroke: "var(--ink-600)", "stroke-width": "1", "stroke-dasharray": "2 4", opacity: "0.4",
        }));
      }
    }

    const linePath = smoothPath(pts);
    const areaPath =
      linePath +
      ` L ${pts[pts.length - 1][0]},${padding.top + innerH}` +
      ` L ${pts[0][0]},${padding.top + innerH} Z`;

    const area = el("path", { d: areaPath, fill: `url(#${gradientId})` });
    const line = el("path", {
      d: linePath, fill: "none", stroke: lineColor, "stroke-width": "2",
      "stroke-linejoin": "round", "stroke-linecap": "round",
    });
    svg.appendChild(area);
    svg.appendChild(line);

    // Animate stroke draw
    if (!reduced()) {
      const len = line.getTotalLength ? 0 : 0; // setter below works even pre-attach
      line.style.transition = "stroke-dashoffset 1200ms cubic-bezier(0.22,1,0.36,1)";
      requestAnimationFrame(() => {
        const length = line.getTotalLength();
        line.style.strokeDasharray = length;
        line.style.strokeDashoffset = length;
        requestAnimationFrame(() => { line.style.strokeDashoffset = "0"; });
      });
      area.style.opacity = "0";
      area.style.transition = "opacity 900ms 400ms cubic-bezier(0.22,1,0.36,1)";
      requestAnimationFrame(() => { area.style.opacity = "1"; });
    }

    // Crosshair + tooltip
    const cross = el("line", { x1: 0, x2: 0, y1: padding.top, y2: padding.top + innerH, stroke: "var(--mint-400)", "stroke-width": "1", opacity: "0" });
    svg.appendChild(cross);

    const tooltip = document.createElement("div");
    Object.assign(tooltip.style, {
      position: "absolute", background: "var(--ink-700)", border: "1px solid var(--ink-500)",
      borderRadius: "6px", padding: "6px 10px", fontFamily: "var(--font-mono)",
      fontSize: "var(--fs-tiny)", color: "var(--ink-100)", pointerEvents: "none",
      opacity: "0", transition: "opacity 120ms", whiteSpace: "nowrap", zIndex: "10",
    });
    container.style.position = container.style.position || "relative";
    container.appendChild(tooltip);

    svg.addEventListener("mousemove", (e) => {
      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * width;
      const idx = Math.max(0, Math.min(values.length - 1, Math.round((x - padding.left) / stepX)));
      const [px, py] = pts[idx];
      cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.setAttribute("opacity", "0.5");
      const v = values[idx];
      const label = data[idx]?.label || `#${idx + 1}`;
      tooltip.innerHTML = `<div style="color:var(--ink-400);font-size:10px;">${label}</div><div>${fmt(v, { currency, decimals: 0 })}</div>`;
      tooltip.style.opacity = "1";
      tooltip.style.left = `${px - 40}px`;
      tooltip.style.top = `${py - 48}px`;
    });
    svg.addEventListener("mouseleave", () => {
      cross.setAttribute("opacity", "0");
      tooltip.style.opacity = "0";
    });

    container.appendChild(svg);
  }

  // ---------- sparkline ----------
  function sparkline(container, data, opts = {}) {
    if (!container || !data || !data.length) return;
    const { height = 36, stroke = "var(--mint-400)", strokeWidth = 1.5, fill = true } = opts;
    clearChildren(container);
    const width = container.clientWidth || 120;
    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height: String(height) });

    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const stepX = width / Math.max(1, data.length - 1);
    const pts = data.map((v, i) => [i * stepX, height - 2 - ((v - min) / range) * (height - 4)]);
    const d = smoothPath(pts);

    if (fill) {
      const gradId = "pfc-spark-" + Math.random().toString(36).slice(2, 7);
      const defs = el("defs");
      const g = el("linearGradient", { id: gradId, x1: "0", x2: "0", y1: "0", y2: "1" });
      g.appendChild(el("stop", { offset: "0%", "stop-color": stroke, "stop-opacity": "0.35" }));
      g.appendChild(el("stop", { offset: "100%", "stop-color": stroke, "stop-opacity": "0" }));
      defs.appendChild(g);
      svg.appendChild(defs);
      const area = el("path", { d: `${d} L ${pts[pts.length - 1][0]},${height} L 0,${height} Z`, fill: `url(#${gradId})` });
      svg.appendChild(area);
    }
    const line = el("path", { d, fill: "none", stroke, "stroke-width": strokeWidth, "stroke-linecap": "round", "stroke-linejoin": "round" });
    svg.appendChild(line);

    if (!reduced()) {
      requestAnimationFrame(() => {
        const len = line.getTotalLength();
        line.style.strokeDasharray = len;
        line.style.strokeDashoffset = len;
        line.style.transition = "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)";
        requestAnimationFrame(() => { line.style.strokeDashoffset = "0"; });
      });
    }
    container.appendChild(svg);
  }

  // ---------- donut ----------
  function donut(container, segments, opts = {}) {
    if (!container || !segments || !segments.length) return;
    const { size = 200, thickness = 22, gap = 2, centerLabel, centerValue } = opts;
    clearChildren(container);
    const r = size / 2 - thickness / 2 - 2;
    const cx = size / 2, cy = size / 2;
    const circumference = 2 * Math.PI * r;
    const total = segments.reduce((s, x) => s + x.value, 0);

    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, width: String(size), height: String(size) });
    // Track
    svg.appendChild(el("circle", { cx, cy, r, fill: "none", stroke: "var(--ink-600)", "stroke-width": thickness, opacity: "0.4" }));

    let offset = 0;
    segments.forEach((seg, i) => {
      const len = (seg.value / total) * circumference - gap;
      const arc = el("circle", {
        cx, cy, r,
        fill: "none",
        stroke: seg.color || "var(--mint-500)",
        "stroke-width": thickness,
        "stroke-dasharray": `${len} ${circumference}`,
        "stroke-dashoffset": -offset,
        "stroke-linecap": "round",
        transform: `rotate(-90 ${cx} ${cy})`,
      });
      svg.appendChild(arc);
      offset += len + gap;
      if (!reduced()) {
        arc.style.transition = `stroke-dasharray 900ms ${i * 120}ms cubic-bezier(0.22,1,0.36,1)`;
        const finalDash = arc.getAttribute("stroke-dasharray");
        arc.setAttribute("stroke-dasharray", `0 ${circumference}`);
        requestAnimationFrame(() => arc.setAttribute("stroke-dasharray", finalDash));
      }
    });

    container.appendChild(svg);
    container.style.position = container.style.position || "relative";

    if (centerLabel || centerValue) {
      const cap = document.createElement("div");
      Object.assign(cap.style, {
        position: "absolute", inset: "0",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        textAlign: "center", pointerEvents: "none",
      });
      cap.innerHTML = `
        ${centerValue ? `<div class="mono" style="font-size:1.5rem;color:var(--ink-100);font-weight:500;">${centerValue}</div>` : ""}
        ${centerLabel ? `<div style="font-size:var(--fs-tiny);color:var(--ink-400);text-transform:uppercase;letter-spacing:0.12em;font-family:var(--font-mono);">${centerLabel}</div>` : ""}
      `;
      container.appendChild(cap);
    }
  }

  // ---------- progressRing ----------
  function progressRing(container, percent, opts = {}) {
    if (!container) return;
    const { size = 120, thickness = 10, color = "var(--mint-500)", showLabel = true } = opts;
    clearChildren(container);
    const r = size / 2 - thickness / 2 - 2;
    const cx = size / 2, cy = size / 2;
    const circ = 2 * Math.PI * r;
    const dash = (percent / 100) * circ;

    const svg = el("svg", { viewBox: `0 0 ${size} ${size}`, width: String(size), height: String(size) });
    svg.appendChild(el("circle", { cx, cy, r, fill: "none", stroke: "var(--ink-600)", "stroke-width": thickness }));
    const arc = el("circle", {
      cx, cy, r, fill: "none", stroke: color, "stroke-width": thickness,
      "stroke-linecap": "round",
      "stroke-dasharray": `${dash} ${circ}`,
      transform: `rotate(-90 ${cx} ${cy})`,
    });
    svg.appendChild(arc);

    if (!reduced()) {
      arc.style.transition = "stroke-dasharray 1100ms cubic-bezier(0.22,1,0.36,1)";
      arc.setAttribute("stroke-dasharray", `0 ${circ}`);
      requestAnimationFrame(() => arc.setAttribute("stroke-dasharray", `${dash} ${circ}`));
    }

    container.appendChild(svg);
    container.style.position = container.style.position || "relative";
    if (showLabel) {
      const lab = document.createElement("div");
      Object.assign(lab.style, {
        position: "absolute", inset: "0", display: "grid", placeItems: "center",
        fontFamily: "var(--font-mono)", color: "var(--ink-100)", fontSize: "1.125rem",
        fontWeight: "500", pointerEvents: "none",
      });
      lab.textContent = `${Math.round(percent)}%`;
      container.appendChild(lab);
    }
  }

  // ---------- barChart (horizontal) ----------
  function barChart(container, data, opts = {}) {
    if (!container || !data || !data.length) return;
    const { rowHeight = 36, gap = 8, currency } = opts;
    clearChildren(container);
    const max = Math.max(...data.map((d) => d.value));
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = `${gap}px`;

    data.forEach((d, i) => {
      const row = document.createElement("div");
      row.style.cssText = `display:grid;grid-template-columns:120px 1fr auto;align-items:center;gap:12px;height:${rowHeight}px;`;
      const pct = (d.value / max) * 100;
      row.innerHTML = `
        <span style="font-size:var(--fs-small);color:var(--ink-300);">${d.label}</span>
        <div style="position:relative;height:8px;background:var(--ink-600);border-radius:var(--r-full);overflow:hidden;">
          <div style="position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(90deg,var(--mint-500),var(--lavender-500));border-radius:var(--r-full);transition:width 900ms ${i * 80}ms cubic-bezier(0.22,1,0.36,1);" data-bar></div>
        </div>
        <span class="mono" style="font-size:var(--fs-small);color:var(--ink-100);min-width:80px;text-align:right;">${fmt(d.value, { currency, decimals: 0 })}</span>
      `;
      wrap.appendChild(row);
      const bar = row.querySelector("[data-bar]");
      if (reduced()) bar.style.width = `${pct}%`;
      else requestAnimationFrame(() => requestAnimationFrame(() => (bar.style.width = `${pct}%`)));
    });

    container.appendChild(wrap);
  }

  window.PFC_CHARTS = { areaChart, sparkline, donut, progressRing, barChart };
})();

(function () {
  'use strict';

  const canvas = document.getElementById('globe-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const CENTER_LAT = 35  * Math.PI / 180;
  const CENTER_LON = 139 * Math.PI / 180;

  const OCEAN  = '#06111F';
  const GRID   = 'rgba(80,140,220,0.07)';
  const YELLOW = '#FFE033';

  const DESTS = [
    { lat:  37.6, lon:  127.0, label: 'Seoul'         },
    { lat:  31.2, lon:  121.5, label: 'Shanghai'      },
    { lat:  13.8, lon:  100.5, label: 'Bangkok'       },
    { lat:   1.4, lon:  103.8, label: 'Singapore'     },
    { lat: -33.9, lon:  151.2, label: 'Sydney'        },
    { lat:  25.2, lon:   55.3, label: 'Dubai'         },
    { lat:  37.8, lon: -122.4, label: 'San Francisco' },
  ];

  const ARC_DUR   = 1.4;  // sec to draw one arc
  const ARC_GAP   = 2.2;  // sec between arc starts
  const CYCLE_PAD = 3.0;  // sec pause before repeat

  let W, H, cx, cy, R, startTime = null;

  function resize() {
    W = canvas.parentElement.offsetWidth;
    H = Math.round(Math.min(W * 0.54, 520));
    canvas.width  = W;
    canvas.height = H;
    cx = W * 0.5;
    cy = H * 0.5;
    R  = Math.min(W, H) * 0.41;
  }

  function project(lat_d, lon_d) {
    const lat = lat_d * Math.PI / 180;
    const lon = lon_d * Math.PI / 180;
    const dL  = lon - CENTER_LON;
    const dot = Math.sin(CENTER_LAT) * Math.sin(lat)
              + Math.cos(CENTER_LAT) * Math.cos(lat) * Math.cos(dL);
    return {
      x: cx + R * Math.cos(lat) * Math.sin(dL),
      y: cy - R * (Math.cos(CENTER_LAT) * Math.sin(lat)
                 - Math.sin(CENTER_LAT) * Math.cos(lat) * Math.cos(dL)),
      visible: dot > 0.02
    };
  }

  function drawGlobe() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = OCEAN;
    ctx.fill();
    ctx.clip();

    // latitude ellipses
    [-60, -30, 0, 30, 60].forEach(ld => {
      const la  = ld * Math.PI / 180;
      const rx  = R * Math.cos(la);
      const ry  = Math.abs(R * Math.sin(CENTER_LAT) * Math.cos(la));
      const yc  = cy - R * Math.cos(CENTER_LAT) * Math.sin(la);
      if (ry < 1) return;
      ctx.beginPath();
      ctx.ellipse(cx, yc, rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    });

    // longitude lines
    for (let ld = -180; ld < 180; ld += 30) {
      const pts = [];
      for (let la = -85; la <= 85; la += 4) {
        const p = project(la, ld);
        if (p.visible) pts.push(p);
      }
      if (pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    ctx.restore();

    // rim
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function bezierPts(from, to, progress) {
    const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
    const vx = cx - mx, vy = cy - my;
    const vl = Math.sqrt(vx * vx + vy * vy) || 1;
    const pull = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2) * 0.28;
    const cpx = mx + (vx / vl) * pull, cpy = my + (vy / vl) * pull;

    const pts = [];
    const n = 60;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.min(progress, 1);
      pts.push({
        x: (1-t)**2 * from.x + 2*(1-t)*t * cpx + t**2 * to.x,
        y: (1-t)**2 * from.y + 2*(1-t)*t * cpy + t**2 * to.y
      });
    }
    return pts;
  }

  function drawArc(from, to, progress) {
    if (!to.visible || progress <= 0) return;
    const pts = bezierPts(from, to, progress);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // glow
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = 'rgba(255,224,51,0.1)';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = 'rgba(255,224,51,0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // leading dot
    const lp = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(lp.x, lp.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = YELLOW;
    ctx.fill();

    ctx.restore();
  }

  function drawDestDot(p, label) {
    if (!p.visible) return;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
    g.addColorStop(0, 'rgba(255,224,51,0.3)');
    g.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = YELLOW;
    ctx.fill();
    ctx.font = '10px Arial';
    ctx.fillStyle = 'rgba(255,224,51,0.75)';
    ctx.fillText(label, p.x + 7, p.y - 4);
  }

  function drawJapan(t) {
    const p = project(35.7, 139.7);
    const pr = 7 + Math.sin(t * 1.8) * 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, pr + 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,224,51,${0.05 + Math.sin(t*1.8)*0.03})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,224,51,0.2)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = YELLOW;
    ctx.fill();
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = 'rgba(255,224,51,0.9)';
    ctx.fillText('日本', p.x + 10, p.y - 7);
  }

  function arcStates(elapsed) {
    const cycleLen = DESTS.length * ARC_GAP + CYCLE_PAD;
    const t = elapsed % cycleLen;
    return DESTS.map((_, i) => {
      const s = i * ARC_GAP;
      if (t < s) return 0;
      if (t < s + ARC_DUR) return (t - s) / ARC_DUR;
      return 1;
    });
  }

  function render(ts) {
    if (!startTime) startTime = ts;
    const elapsed = (ts - startTime) / 1000;

    ctx.clearRect(0, 0, W, H);
    drawGlobe();

    const japan = project(35.7, 139.7);
    const states = arcStates(elapsed);
    DESTS.forEach((d, i) => {
      const dest = project(d.lat, d.lon);
      drawArc(japan, dest, states[i]);
      if (states[i] >= 1) drawDestDot(dest, d.label);
    });

    drawJapan(elapsed);
    requestAnimationFrame(render);
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(render);
}());

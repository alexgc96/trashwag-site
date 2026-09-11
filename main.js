(() => {
  const canvas = document.getElementById('constellation');
  const ctx = canvas.getContext('2d');

  // Capricornus star positions (normalized 0–1)
  const STARS = [
    { nx: 0.20, ny: 0.32, r: 3.5 }, // 0 α Cap Algedi
    { nx: 0.26, ny: 0.34, r: 3.5 }, // 1 β Cap Dabih
    { nx: 0.44, ny: 0.31, r: 3.5 }, // 2 ψ Cap
    { nx: 0.74, ny: 0.19, r: 5.0 }, // 3 δ Cap Deneb Algedi (brightest)
    { nx: 0.68, ny: 0.30, r: 3.5 }, // 4 γ Cap Nashira
    { nx: 0.63, ny: 0.44, r: 3.0 }, // 5 ε Cap
    { nx: 0.56, ny: 0.60, r: 3.0 }, // 6 θ Cap
    { nx: 0.48, ny: 0.68, r: 3.0 }, // 7 ι Cap
    { nx: 0.37, ny: 0.60, r: 3.0 }, // 8 ζ Cap
    { nx: 0.27, ny: 0.51, r: 3.0 }, // 9 η Cap
  ];

  const EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,0]];

  // Background star field (generated once)
  const BG_STARS = Array.from({ length: 80 }, () => ({
    nx: Math.random(),
    ny: Math.random(),
    r: Math.random() * 1 + 0.5,
    opacity: Math.random() * 0.4 + 0.2,
  }));

  // Timing constants (ms)
  const T_BG_FADE    = 600;
  const T_STAR_START = 600;
  const T_STAR_GAP   = 200;
  const T_STAR_DUR   = 300;
  const T_LINE_START = T_STAR_START + STARS.length * T_STAR_GAP + T_STAR_DUR;
  const T_LINE_DUR   = 120;
  const T_LINE_GAP   = 120;

  let startTime = null;
  let scrollY = 0;
  let heroHeight = 0;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    heroHeight = canvas.height;
  }

  function sx(nx) { return nx * canvas.width; }
  function sy(ny) { return ny * canvas.height; }

  function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function drawFrame(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Idle drift offset (only after intro)
    const idleT = Math.max(0, elapsed - (T_LINE_START + EDGES.length * T_LINE_GAP + T_LINE_DUR));
    const driftX = Math.sin(idleT * 0.0003) * 4;
    const driftY = Math.cos(idleT * 0.0002) * 3;

    // ── Background stars ──
    const bgAlpha = clamp01(elapsed / T_BG_FADE);
    BG_STARS.forEach(s => {
      ctx.beginPath();
      ctx.arc(sx(s.nx), sy(s.ny), s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 215, 255, ${s.opacity * bgAlpha})`;
      ctx.fill();
    });

    // ── Constellation lines ──
    EDGES.forEach(([a, b], i) => {
      const lineStart = T_LINE_START + i * T_LINE_GAP;
      const lineP = clamp01((elapsed - lineStart) / T_LINE_DUR);
      if (lineP <= 0) return;

      const x1 = sx(STARS[a].nx) + driftX;
      const y1 = sy(STARS[a].ny) + driftY;
      const x2 = sx(STARS[b].nx) + driftX;
      const y2 = sy(STARS[b].ny) + driftY;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + (x2 - x1) * ease(lineP), y1 + (y2 - y1) * ease(lineP));
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * ease(lineP)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // ── Constellation stars ──
    STARS.forEach((s, i) => {
      const starStart = T_STAR_START + i * T_STAR_GAP;
      const p = clamp01((elapsed - starStart) / T_STAR_DUR);
      if (p <= 0) return;

      const ep = ease(p);
      const pulse = idleT > 0 ? Math.sin(idleT * 0.001 + i * 0.7) * 6 : 0;

      ctx.save();
      ctx.shadowColor = '#a0b8ff';
      ctx.shadowBlur  = 18 * ep + pulse;
      ctx.beginPath();
      ctx.arc(sx(s.nx) + driftX, sy(s.ny) + driftY, s.r * ep, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${ep})`;
      ctx.fill();
      ctx.restore();
    });

    // ── Scroll parallax ──
    if (scrollY < heroHeight) {
      canvas.style.transform = `translateY(${scrollY * -0.25}px)`;
    }

    requestAnimationFrame(drawFrame);
  }

  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  window.addEventListener('resize', resize);

  resize();
  requestAnimationFrame(drawFrame);
})();

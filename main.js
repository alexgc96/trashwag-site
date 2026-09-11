(() => {
  const canvas = document.getElementById('constellation');
  const ctx = canvas.getContext('2d');

  // Capricornus star positions (normalized 0–1)
  const STARS = [
    { nx: 0.20, ny: 0.32, r: 3.5, anchor: 'about'    }, // 0 α Cap Algedi
    { nx: 0.26, ny: 0.34, r: 3.5                      }, // 1 β Cap Dabih
    { nx: 0.44, ny: 0.31, r: 3.5, anchor: 'blog'      }, // 2 ψ Cap
    { nx: 0.74, ny: 0.19, r: 5.0, anchor: 'services'  }, // 3 δ Cap Deneb Algedi
    { nx: 0.68, ny: 0.30, r: 3.5                      }, // 4 γ Cap Nashira
    { nx: 0.63, ny: 0.44, r: 3.0                      }, // 5 ε Cap
    { nx: 0.56, ny: 0.60, r: 3.0                      }, // 6 θ Cap
    { nx: 0.48, ny: 0.68, r: 3.0                      }, // 7 ι Cap
    { nx: 0.37, ny: 0.60, r: 3.0                      }, // 8 ζ Cap
    { nx: 0.27, ny: 0.51, r: 3.0                      }, // 9 η Cap
  ];

  const EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,0]];

  const BG_STARS = Array.from({ length: 80 }, () => ({
    nx: Math.random(),
    ny: Math.random(),
    r: Math.random() * 1 + 0.5,
    opacity: Math.random() * 0.4 + 0.2,
  }));

  const T_BG_FADE    = 600;
  const T_STAR_START = 600;
  const T_STAR_GAP   = 200;
  const T_STAR_DUR   = 300;
  const T_LINE_START = T_STAR_START + STARS.length * T_STAR_GAP + T_STAR_DUR;
  const T_LINE_DUR   = 120;
  const T_LINE_GAP   = 120;

  let startTime  = null;
  let scrollY    = 0;
  let heroHeight = 0;
  let mouseNX = 0, mouseNY = 0;
  let lerpMX  = 0, lerpMY  = 0;
  let rawMouseX = -9999, rawMouseY = -9999;
  let hoveredStar = null;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    heroHeight = canvas.height;
  }

  function sx(nx) { return nx * canvas.width; }
  function sy(ny) { return ny * canvas.height; }

  const STAGE_ASPECT = 1.6;
  const STAGE_PAD    = 0.75;
  function getStage() {
    const canvasAspect = canvas.width / canvas.height;
    let w, h;
    if (canvasAspect > STAGE_ASPECT) {
      h = canvas.height * STAGE_PAD;
      w = h * STAGE_ASPECT;
    } else {
      w = canvas.width * STAGE_PAD;
      h = w / STAGE_ASPECT;
    }
    return { w, h, x: (canvas.width - w) / 2, y: (canvas.height - h) / 2 };
  }
  function cx(nx, stage) { return stage.x + nx * stage.w; }
  function cy(ny, stage) { return stage.y + ny * stage.h; }

  function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function drawFrame(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    lerpMX += (mouseNX - lerpMX) * 0.04;
    lerpMY += (mouseNY - lerpMY) * 0.04;

    const idleT = Math.max(0, elapsed - (T_LINE_START + EDGES.length * T_LINE_GAP + T_LINE_DUR));
    const driftX = Math.sin(idleT * 0.0003) * 4;
    const driftY = Math.cos(idleT * 0.0002) * 3;
    const bgPX  = lerpMX * 8;
    const bgPY  = lerpMY * 6;
    const conPX = lerpMX * 20;
    const conPY = lerpMY * 15;

    // ── Background stars ──
    const bgAlpha = clamp01(elapsed / T_BG_FADE);
    BG_STARS.forEach(s => {
      ctx.beginPath();
      ctx.arc(sx(s.nx) + bgPX, sy(s.ny) + bgPY, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 215, 255, ${s.opacity * bgAlpha})`;
      ctx.fill();
    });

    const stage = getStage();

    // ── Constellation lines ──
    EDGES.forEach(([a, b], i) => {
      const lineStart = T_LINE_START + i * T_LINE_GAP;
      const lineP = clamp01((elapsed - lineStart) / T_LINE_DUR);
      if (lineP <= 0) return;

      const x1 = cx(STARS[a].nx, stage) + driftX + conPX;
      const y1 = cy(STARS[a].ny, stage) + driftY + conPY;
      const x2 = cx(STARS[b].nx, stage) + driftX + conPX;
      const y2 = cy(STARS[b].ny, stage) + driftY + conPY;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1 + (x2 - x1) * ease(lineP), y1 + (y2 - y1) * ease(lineP));
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * ease(lineP)})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // ── Constellation stars ──
    let nextHovered = null;

    STARS.forEach((s, i) => {
      const starStart = T_STAR_START + i * T_STAR_GAP;
      const p = clamp01((elapsed - starStart) / T_STAR_DUR);
      if (p <= 0) return;

      const ep     = ease(p);
      const pulse  = idleT > 0 ? Math.sin(idleT * 0.001 + i * 0.7) * 6 : 0;
      const starX  = cx(s.nx, stage) + driftX + conPX;
      const starY  = cy(s.ny, stage) + driftY + conPY;

      // Hit detection (only once intro is mostly done)
      if (s.anchor && ep > 0.8) {
        const dist = Math.hypot(rawMouseX - starX, rawMouseY - starY);
        if (dist < 22) nextHovered = s;
      }

      const isHovered  = hoveredStar === s;
      const glowBoost  = isHovered ? 12 : 0;
      const radiusBoost = isHovered ? 1  : 0;

      ctx.save();
      ctx.shadowColor = '#a0b8ff';
      ctx.shadowBlur  = 18 * ep + pulse + glowBoost;
      ctx.beginPath();
      ctx.arc(starX, starY, (s.r + radiusBoost) * ep, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${ep})`;
      ctx.fill();
      ctx.restore();

      // Cache draw position for label
      s._x  = starX;
      s._y  = starY;
      s._ep = ep;
    });

    hoveredStar = nextHovered;
    canvas.style.cursor = hoveredStar ? 'pointer' : '';

    // ── Hover label ──
    if (hoveredStar && hoveredStar._ep > 0.8) {
      ctx.save();
      ctx.font = '11px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.textAlign = 'center';
      ctx.fillText(hoveredStar.anchor, hoveredStar._x, hoveredStar._y - hoveredStar.r - 10);
      ctx.restore();
    }

    // ── Scroll parallax ──
    if (scrollY < heroHeight) {
      canvas.style.transform = `translateY(${scrollY * -0.25}px)`;
    }

    requestAnimationFrame(drawFrame);
  }

  // ── Event listeners ──
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    rawMouseX = e.clientX - r.left;
    rawMouseY = e.clientY - r.top;
    mouseNX = (rawMouseX / r.width  - 0.5) * 2;
    mouseNY = (rawMouseY / r.height - 0.5) * 2;
  });

  canvas.addEventListener('mouseleave', () => {
    mouseNX = 0; mouseNY = 0;
    rawMouseX = -9999; rawMouseY = -9999;
  });

  canvas.addEventListener('click', () => {
    if (hoveredStar?.anchor) {
      document.getElementById(hoveredStar.anchor)
        .scrollIntoView({ behavior: 'smooth' });
    }
  });

  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });
  window.addEventListener('resize', resize);

  // ── Section reveal ──
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add('revealed');
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // ── TOC active state ──
  const tocLinks = Object.fromEntries(
    [...document.querySelectorAll('.toc a')].map(a => [a.getAttribute('href').slice(1), a])
  );
  const tocObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const link = tocLinks[e.target.id];
      if (link) link.classList.toggle('toc-active', e.isIntersecting);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('section[id]').forEach(el => tocObserver.observe(el));

  resize();
  requestAnimationFrame(drawFrame);
})();

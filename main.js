(() => {
  // ── Navigation ──────────────────────────────────────────────────────────────
  const SECTION_ORDER = ['hero', 'about', 'blog', 'services', 'contact'];
  let currentIdx    = 0;
  let transitioning = false;

  function navigateTo(targetId) {
    const targetIdx = SECTION_ORDER.indexOf(targetId);
    if (targetIdx === -1 || targetIdx === currentIdx || transitioning) return;

    transitioning = true;
    const forward  = targetIdx > currentIdx;
    const outgoing = document.getElementById(SECTION_ORDER[currentIdx]);
    const incoming = document.getElementById(targetId);

    // Pre-position incoming off-screen with no transition
    incoming.style.transition = 'none';
    incoming.style.transform  = forward ? 'translateX(100%)' : 'translateX(-100%)';
    incoming.offsetHeight; // force reflow

    // Animate
    incoming.style.transition = '';
    incoming.style.transform  = '';
    incoming.classList.add('active');
    outgoing.classList.remove('active');
    outgoing.classList.add(forward ? 'exit-left' : 'exit-right');

    currentIdx = targetIdx;

    // Update TOC active
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.classList.toggle('toc-active', el.dataset.nav === targetId);
    });

    outgoing.addEventListener('transitionend', () => {
      outgoing.classList.remove('exit-left', 'exit-right');
      transitioning = false;
    }, { once: true });
  }

  // Wire all [data-nav] elements
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.nav));
  });

  // Set initial TOC active
  document.querySelectorAll('[data-nav="hero"]').forEach(el =>
    el.classList.add('toc-active')
  );

  // ── Burger ──────────────────────────────────────────────────────────────────
  const burger    = document.querySelector('.burger');
  const mobileNav = document.querySelector('.mobile-nav');

  function closeMobileNav() {
    mobileNav.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
  }

  burger.addEventListener('click', () => {
    const isOpen = mobileNav.classList.toggle('open');
    burger.classList.toggle('open', isOpen);
    burger.setAttribute('aria-expanded', isOpen);
  });

  document.querySelector('.mobile-nav-close').addEventListener('click', closeMobileNav);

  mobileNav.querySelectorAll('[data-nav]').forEach(a => {
    a.addEventListener('click', closeMobileNav);
  });

  // ── Constellation canvas ─────────────────────────────────────────────────────
  const canvas = document.getElementById('constellation');
  const ctx = canvas.getContext('2d');

  const STARS = [
    { nx: 0.20, ny: 0.32, r: 3.5, anchor: 'about',   hoverP: 0 }, // 0 α Cap Algedi
    { nx: 0.26, ny: 0.34, r: 3.5,                     hoverP: 0 }, // 1 β Cap Dabih
    { nx: 0.44, ny: 0.31, r: 3.5, anchor: 'blog',     hoverP: 0 }, // 2 ψ Cap
    { nx: 0.74, ny: 0.19, r: 5.0, anchor: 'services', hoverP: 0 }, // 3 δ Cap Deneb Algedi
    { nx: 0.68, ny: 0.30, r: 3.5,                     hoverP: 0 }, // 4 γ Cap Nashira
    { nx: 0.63, ny: 0.44, r: 3.0,                     hoverP: 0 }, // 5 ε Cap
    { nx: 0.56, ny: 0.60, r: 3.0,                     hoverP: 0 }, // 6 θ Cap
    { nx: 0.48, ny: 0.68, r: 3.0,                     hoverP: 0 }, // 7 ι Cap
    { nx: 0.37, ny: 0.60, r: 3.0,                     hoverP: 0 }, // 8 ζ Cap
    { nx: 0.27, ny: 0.51, r: 3.0,                     hoverP: 0 }, // 9 η Cap
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

  let startTime = null;
  let mouseNX = 0, mouseNY = 0;
  let lerpMX  = 0, lerpMY  = 0;
  let rawMouseX = -9999, rawMouseY = -9999;
  let hoveredStar = null;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
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

    const bgAlpha = clamp01(elapsed / T_BG_FADE);
    BG_STARS.forEach(s => {
      ctx.beginPath();
      ctx.arc(sx(s.nx) + bgPX, sy(s.ny) + bgPY, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 215, 255, ${s.opacity * bgAlpha})`;
      ctx.fill();
    });

    const stage = getStage();

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

    let nextHovered = null;

    STARS.forEach((s, i) => {
      const starStart = T_STAR_START + i * T_STAR_GAP;
      const p = clamp01((elapsed - starStart) / T_STAR_DUR);
      if (p <= 0) return;

      const ep    = ease(p);
      const pulse = idleT > 0 ? Math.sin(idleT * 0.001 + i * 0.7) * 6 : 0;
      const starX = cx(s.nx, stage) + driftX + conPX;
      const starY = cy(s.ny, stage) + driftY + conPY;

      if (s.anchor && ep > 0.8) {
        const dist = Math.hypot(rawMouseX - starX, rawMouseY - starY);
        if (dist < 22) nextHovered = s;
      }

      const isHovered = hoveredStar === s;
      s.hoverP = clamp01(s.hoverP + (isHovered ? 0.06 : -0.06));

      ctx.save();
      ctx.shadowColor = '#a0b8ff';
      ctx.shadowBlur  = 18 * ep + pulse + s.hoverP * 18;
      ctx.beginPath();
      ctx.arc(starX, starY, (s.r + s.hoverP * 3) * ep, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${ep})`;
      ctx.fill();
      ctx.restore();

      if (s.anchor && s.hoverP > 0.01 && ep > 0.8) {
        ctx.save();
        ctx.font = 'bold 10px Arial';
        ctx.fillStyle = `rgba(255, 255, 255, ${s.hoverP * 0.9})`;
        ctx.textAlign = 'center';
        ctx.letterSpacing = '0.15em';
        ctx.fillText(s.anchor.toUpperCase(), starX, starY - s.r - s.hoverP * 3 - 10);
        ctx.restore();
      }
    });

    hoveredStar = nextHovered;
    canvas.style.cursor = hoveredStar ? 'pointer' : '';

    requestAnimationFrame(drawFrame);
  }

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
    if (hoveredStar?.anchor) navigateTo(hoveredStar.anchor);
  });

  window.addEventListener('resize', resize);

  // ── Scroll / swipe navigation ──
  function stepNav(dir) {
    const nextIdx = currentIdx + dir;
    if (nextIdx >= 0 && nextIdx < SECTION_ORDER.length) {
      navigateTo(SECTION_ORDER[nextIdx]);
    }
  }

  window.addEventListener('wheel', e => {
    if (transitioning) return;
    stepNav(e.deltaY > 0 ? 1 : -1);
  }, { passive: true });

  let touchStartY = 0;
  window.addEventListener('touchstart', e => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  window.addEventListener('touchend', e => {
    if (transitioning) return;
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (Math.abs(delta) < 50) return;
    stepNav(delta > 0 ? 1 : -1);
  }, { passive: true });

  // ── Mini constellations (blog columns) ──────────────────────────────────────
  function initMini(canvasId, stars, edges) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const x = c.getContext('2d');
    const PAD = 0.12;

    const bg = Array.from({ length: 25 }, () => ({
      nx: Math.random(), ny: Math.random(),
      r: Math.random() * 0.8 + 0.3,
      op: Math.random() * 0.3 + 0.15,
    }));

    function resizeMini() { c.width = c.offsetWidth; c.height = c.offsetHeight; }

    const px = nx => (PAD + nx * (1 - 2 * PAD)) * c.width;
    const py = ny => (PAD + ny * (1 - 2 * PAD)) * c.height;

    let t0 = null;
    function draw(ts) {
      if (!t0) t0 = ts;
      const t = ts - t0;
      x.clearRect(0, 0, c.width, c.height);

      const dx = Math.sin(t * 0.0003) * 2;
      const dy = Math.cos(t * 0.00025) * 1.5;

      bg.forEach(s => {
        x.beginPath();
        x.arc(s.nx * c.width, s.ny * c.height, s.r, 0, Math.PI * 2);
        x.fillStyle = `rgba(200, 215, 255, ${s.op})`;
        x.fill();
      });

      edges.forEach(([a, b]) => {
        x.beginPath();
        x.moveTo(px(stars[a].nx) + dx, py(stars[a].ny) + dy);
        x.lineTo(px(stars[b].nx) + dx, py(stars[b].ny) + dy);
        x.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        x.lineWidth = 0.8;
        x.stroke();
      });

      stars.forEach(s => {
        const pulse = Math.sin(t * 0.001 + s.nx * 8) * 3;
        x.save();
        x.shadowColor = '#a0b8ff';
        x.shadowBlur = 8 + pulse;
        x.beginPath();
        x.arc(px(s.nx) + dx, py(s.ny) + dy, s.r, 0, Math.PI * 2);
        x.fillStyle = '#fff';
        x.fill();
        x.restore();
      });

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resizeMini);
    resizeMini();
    requestAnimationFrame(draw);
  }

  initMini('blog-canvas-libra', [
    { nx: 0.20, ny: 0.35, r: 2.5 },
    { nx: 0.62, ny: 0.20, r: 3.0 },
    { nx: 0.46, ny: 0.55, r: 2.0 },
    { nx: 0.75, ny: 0.58, r: 2.0 },
    { nx: 0.14, ny: 0.78, r: 2.0 },
  ], [[0,1],[0,2],[2,3],[0,4]]);

  initMini('blog-canvas-gemini', [
    { nx: 0.28, ny: 0.08, r: 2.5 },
    { nx: 0.62, ny: 0.12, r: 3.0 },
    { nx: 0.20, ny: 0.33, r: 2.0 },
    { nx: 0.16, ny: 0.58, r: 2.0 },
    { nx: 0.10, ny: 0.85, r: 2.0 },
    { nx: 0.70, ny: 0.80, r: 2.0 },
    { nx: 0.65, ny: 0.55, r: 2.0 },
    { nx: 0.58, ny: 0.36, r: 2.0 },
  ], [[0,1],[0,2],[2,3],[3,4],[1,7],[7,6],[6,5]]);

  initMini('blog-canvas-scorpio', [
    { nx: 0.08, ny: 0.28, r: 2.0 },
    { nx: 0.16, ny: 0.20, r: 2.0 },
    { nx: 0.22, ny: 0.35, r: 2.0 },
    { nx: 0.18, ny: 0.48, r: 3.5 },
    { nx: 0.26, ny: 0.58, r: 2.0 },
    { nx: 0.36, ny: 0.65, r: 2.0 },
    { nx: 0.48, ny: 0.70, r: 2.0 },
    { nx: 0.60, ny: 0.72, r: 2.0 },
    { nx: 0.70, ny: 0.65, r: 2.0 },
    { nx: 0.78, ny: 0.52, r: 2.0 },
    { nx: 0.84, ny: 0.38, r: 2.0 },
    { nx: 0.82, ny: 0.24, r: 2.5 },
    { nx: 0.76, ny: 0.15, r: 2.5 },
  ], [[0,1],[0,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12]]);

  resize();
  requestAnimationFrame(drawFrame);
})();

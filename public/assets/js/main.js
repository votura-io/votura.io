/* Votura: site behaviour.
 *
 * 1. Theme switcher (bottom-right corner): Tribar, Monolith or Blueprint.
 *    The choice is saved per visitor; theme.js applies it before first paint.
 * 2. Copy button for the contact address, and the footer year.
 * 3. The hero figure: Lagrange–Gauss reduction of a basis of the hexagonal lattice.
 */
(() => {
  'use strict';

  /* 1. Theme switcher ------------------------------------------------------ */

  const THEME_COLORS = { tribar: '#10112B', monolith: '#5A2BF0', blueprint: '#2B1585' };
  const root = document.documentElement;
  const switcher = document.querySelector('[data-theme-switcher]');
  const iconLink = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(name, save) {
    if (!THEME_COLORS[name]) return;
    root.setAttribute('data-brand', name);
    if (themeColorMeta) themeColorMeta.setAttribute('content', THEME_COLORS[name]);
    if (switcher) {
      switcher.querySelectorAll('[data-theme]').forEach((button) => {
        const active = button.getAttribute('data-theme') === name;
        button.setAttribute('aria-pressed', String(active));
        const img = button.querySelector('img');
        if (active && img && iconLink) iconLink.setAttribute('href', img.src);
      });
    }
    if (save) {
      try {
        window.localStorage.setItem('votura-theme', name);
      } catch (error) {
        /* Storage unavailable: the theme still applies until the page is left. */
      }
    }
    document.dispatchEvent(new CustomEvent('votura:themechange'));
  }

  if (switcher) {
    switcher.hidden = false;
    switcher.addEventListener('click', (event) => {
      const button = event.target.closest('[data-theme]');
      if (button) applyTheme(button.getAttribute('data-theme'), true);
    });
    applyTheme(root.getAttribute('data-brand') || 'tribar', false);
  }

  /* 2. Copy button and footer year ----------------------------------------- */

  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = year;
  });

  const copyButton = document.querySelector('[data-copy]');
  const copyStatus = document.querySelector('[data-copy-status]');
  if (copyButton && navigator.clipboard && window.isSecureContext) {
    const label = copyButton.textContent;
    let resetTimer = 0;
    copyButton.hidden = false;
    copyButton.addEventListener('click', async () => {
      let message;
      try {
        await navigator.clipboard.writeText(copyButton.getAttribute('data-copy'));
        copyButton.textContent = 'Copied';
        message = 'Email address copied to the clipboard.';
      } catch (error) {
        copyButton.textContent = 'Copy failed';
        message = 'The address could not be copied. Select it and copy it manually.';
      }
      if (copyStatus) copyStatus.textContent = message;
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        copyButton.textContent = label;
        if (copyStatus) copyStatus.textContent = '';
      }, 2400);
    });
  }

  /* 3. The lattice figure -------------------------------------------------- */

  const canvas = document.getElementById('lattice');
  if (canvas && canvas.getContext) initLattice(canvas);

  function initLattice(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = canvas.parentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const SPAN = 12; // canvas width, in lattice spacings
    const FIT = 9.6; // every parallelogram drawn must fit in a FIT x FIT box
    const HOLD = 900; // ms before the first step
    const SHEAR = 1000; // ms per reduction step
    const SWAP = 260; // ms pause when b1 and b2 trade places
    const GAP = 320; // ms between steps
    const REST = 5000; // ms to show the reduced basis before starting over
    const FADE = 450; // ms to fade one basis out and the next one in
    const H = Math.sqrt(3) / 2;

    // The hexagonal lattice A2 with basis g1 = (1, 0), g2 = (1/2, √3/2). A lattice
    // vector is stored as integer coordinates [x, y] meaning x·g1 + y·g2, so the
    // reduction below runs in exact integer arithmetic.
    const ip = (u, v) => 2 * u[0] * v[0] + u[0] * v[1] + u[1] * v[0] + 2 * u[1] * v[1]; // 2⟨u, v⟩
    const minus = (u, v, k) => [u[0] - k * v[0], u[1] - k * v[1]];
    const rotate60 = (v) => [-v[1], v[0] + v[1]]; // a symmetry of A2
    const toPlane = (v) => [v[0] + v[1] / 2, v[1] * H];
    const planeBasis = (basis) => [toPlane(basis[0]), toPlane(basis[1])];

    // Lagrange–Gauss reduction. Returns every basis it passes through.
    function reduce(b1, b2) {
      const steps = [];
      for (let guard = 0; guard < 64; guard += 1) {
        if (ip(b2, b2) < ip(b1, b1)) {
          [b1, b2] = [b2, b1];
          steps.push({ kind: 'swap', basis: [b1, b2] });
        }
        // mu = ⟨b1, b2⟩ / ⟨b1, b1⟩ rounded to the nearest integer (halves round up)
        const mu = Math.floor((2 * ip(b1, b2) + ip(b1, b1)) / (2 * ip(b1, b1)));
        if (mu === 0) break;
        b2 = minus(b2, b1, mu);
        steps.push({ kind: 'shear', basis: [b1, b2] });
      }
      return steps;
    }

    function bounds(bases) {
      let x0 = 0;
      let x1 = 0;
      let y0 = 0;
      let y1 = 0;
      for (const [a, b] of bases) {
        for (const v of [a, b, [a[0] + b[0], a[1] + b[1]]]) {
          const [x, y] = toPlane(v);
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      }
      return { w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
    }

    // A long, skewed basis of the same lattice: random unimodular moves applied
    // to the short basis, then a random rotation by a multiple of 60 degrees.
    function randomStart() {
      let b1 = [1, 0];
      let b2 = [0, 1];
      const moves = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < moves; i += 1) {
        const k = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.75 ? 1 : 2);
        if (i % 2 === 0) b2 = minus(b2, b1, -k);
        else b1 = minus(b1, b2, -k);
      }
      for (let r = Math.floor(Math.random() * 6); r > 0; r -= 1) {
        b1 = rotate60(b1);
        b2 = rotate60(b2);
      }
      return Math.random() < 0.5 ? [b1, b2] : [b2, b1];
    }

    function makePlan() {
      for (let attempt = 0; attempt < 500; attempt += 1) {
        const start = randomStart();
        const steps = reduce(start[0], start[1]);
        const shears = steps.filter((step) => step.kind === 'shear').length;
        if (shears < 2 || shears > 5) continue;
        const lengths = Math.sqrt((ip(start[0], start[0]) / 2) * (ip(start[1], start[1]) / 2));
        if (lengths / H < 3) continue; // orthogonality defect of the starting basis
        const box = bounds([start, ...steps.map((step) => step.basis)]);
        if (box.w > FIT || box.h > FIT) continue;
        return { start, steps, center: [box.cx, box.cy] };
      }
      const start = [[2, 1], [3, 2]];
      const steps = reduce(start[0], start[1]);
      const box = bounds([start, ...steps.map((step) => step.basis)]);
      return { start, steps, center: [box.cx, box.cy] };
    }

    function schedule(plan) {
      const segments = [];
      let t = HOLD;
      let previous = plan.start;
      for (const step of plan.steps) {
        const duration = step.kind === 'shear' ? SHEAR : SWAP;
        segments.push({ t0: t, t1: t + duration, from: previous, to: step.basis, kind: step.kind });
        t += duration + (step.kind === 'shear' ? GAP : 0);
        previous = step.basis;
      }
      return { segments, end: t, last: previous };
    }

    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    function basisAt(t) {
      for (const segment of timeline.segments) {
        if (t < segment.t0) return planeBasis(segment.from);
        if (t < segment.t1) {
          if (segment.kind === 'swap') return planeBasis(segment.from);
          const e = ease((t - segment.t0) / (segment.t1 - segment.t0));
          const [a1, a2] = planeBasis(segment.from);
          const [, c2] = planeBasis(segment.to);
          // A shear moves b2 along b1, so the area of the parallelogram never changes.
          return [a1, [a2[0] + (c2[0] - a2[0]) * e, a2[1] + (c2[1] - a2[1]) * e]];
        }
      }
      return planeBasis(timeline.last);
    }

    let plan = makePlan();
    let timeline = schedule(plan);
    // Phases: 'idle' (waiting to be seen), 'reduce', 'rest', 'fade' (out, then a new basis)
    let phase = 'idle';
    let phaseStart = 0;
    let fadeIn = false;
    let visible = false;
    let cyclePending = false;
    let rafId = 0;
    let restTimer = 0;
    let size = { css: 0, dpr: 1 };
    let colors = readColors();

    function readColors() {
      const styles = getComputedStyle(canvas);
      const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback;
      return {
        point: read('--fig-point', 'rgba(255, 255, 255, 0.55)'),
        vector: read('--fig-vector', '#ffffff'),
        fill: read('--fig-fill', 'rgba(255, 255, 255, 0.2)'),
        ghost: read('--fig-ghost', 'rgba(255, 255, 255, 0.5)'),
        textFont: getComputedStyle(document.body).fontFamily,
      };
    }

    function draw(basis, showGhost, alpha) {
      const { css, dpr } = size;
      if (!css) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, css, css);

      const s = css / SPAN;
      const ox = css / 2 - plan.center[0] * s; // screen position of the origin
      const oy = css / 2 + plan.center[1] * s;
      const sx = (p) => ox + p[0] * s;
      const sy = (p) => oy - p[1] * s;
      const radius = css / 2;

      // Lattice points, fading out towards the edge of the figure.
      const dot = Math.max(1.25, s * 0.045);
      ctx.fillStyle = colors.point;
      const jMin = Math.floor((oy - css) / (s * H)) - 1;
      const jMax = Math.ceil(oy / (s * H)) + 1;
      for (let j = jMin; j <= jMax; j += 1) {
        const y = oy - j * H * s;
        const iMin = Math.floor(-ox / s - j / 2) - 1;
        const iMax = Math.ceil((css - ox) / s - j / 2) + 1;
        for (let i = iMin; i <= iMax; i += 1) {
          const x = ox + (i + j / 2) * s;
          const d = Math.hypot(x - css / 2, y - css / 2) / radius;
          if (d >= 0.98) continue;
          const fade = d < 0.55 ? 1 : 1 - (d - 0.55) / 0.43;
          ctx.globalAlpha = fade * fade;
          ctx.beginPath();
          ctx.arc(x, y, dot, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (alpha <= 0) return;

      ctx.save();
      ctx.globalAlpha = alpha;
      const [b1, b2] = basis;
      const corner = [b1[0] + b2[0], b1[1] + b2[1]];
      const outline = (u, v, w) => {
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(sx(u), sy(u));
        ctx.lineTo(sx(w), sy(w));
        ctx.lineTo(sx(v), sy(v));
        ctx.closePath();
      };

      // The starting basis, dashed, once the reduction has begun.
      if (showGhost) {
        const [g1, g2] = planeBasis(plan.start);
        ctx.save();
        ctx.setLineDash([4, 5]);
        ctx.lineCap = 'butt';
        ctx.strokeStyle = colors.ghost;
        ctx.lineWidth = 1.25;
        outline(g1, g2, [g1[0] + g2[0], g1[1] + g2[1]]);
        ctx.stroke();
        ctx.restore();
      }

      // The current fundamental parallelogram.
      outline(b1, b2, corner);
      ctx.fillStyle = colors.fill;
      ctx.fill();
      ctx.save();
      ctx.globalAlpha = alpha * 0.45;
      ctx.strokeStyle = colors.vector;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx(b1), sy(b1));
      ctx.lineTo(sx(corner), sy(corner));
      ctx.lineTo(sx(b2), sy(b2));
      ctx.stroke();
      ctx.restore();

      arrow(ox, oy, sx(b1), sy(b1));
      arrow(ox, oy, sx(b2), sy(b2));

      ctx.fillStyle = colors.vector;
      ctx.beginPath();
      ctx.arc(ox, oy, dot + 1.5, 0, Math.PI * 2);
      ctx.fill();

      label('1', b1, b2);
      label('2', b2, b1);
      ctx.restore();

      function arrow(x0, y0, x1, y1) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const length = Math.hypot(dx, dy);
        if (length < 2) return;
        const ux = dx / length;
        const uy = dy / length;
        const head = Math.min(10, length * 0.35);
        const wing = head * 0.42;
        ctx.strokeStyle = colors.vector;
        ctx.fillStyle = colors.vector;
        ctx.lineWidth = 1.75;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1 - ux * head * 0.7, y1 - uy * head * 0.7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - ux * head - uy * wing, y1 - uy * head + ux * wing);
        ctx.lineTo(x1 - ux * head + uy * wing, y1 - uy * head - ux * wing);
        ctx.closePath();
        ctx.fill();
      }

      // "b" with a subscript, placed past the tip and away from the other vector.
      function label(index, v, other) {
        const x = sx(v) - ox;
        const y = sy(v) - oy;
        const length = Math.hypot(x, y);
        if (length < 2) return;
        let nx = -y / length;
        let ny = x / length;
        if (nx * (sx(other) - ox) + ny * (sy(other) - oy) > 0) {
          nx = -nx;
          ny = -ny;
        }
        const px = sx(v) + (x / length) * 11 + nx * 12;
        const py = sy(v) + (y / length) * 11 + ny * 12;
        const fontSize = Math.round(Math.min(18, Math.max(14, s * 0.42)));
        ctx.fillStyle = colors.vector;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.font = `600 ${fontSize}px ${colors.textFont}`;
        ctx.fillText('b', px + 1, py);
        ctx.textAlign = 'left';
        ctx.font = `600 ${Math.round(fontSize * 0.68)}px ${colors.textFont}`;
        ctx.fillText(index, px + 2, py + fontSize * 0.3);
      }
    }

    function render(now = performance.now()) {
      const t = now - phaseStart;
      if (phase === 'reduce') {
        draw(basisAt(t), t >= HOLD, fadeIn ? Math.min(1, t / FADE) : 1);
      } else if (phase === 'fade') {
        draw(planeBasis(timeline.last), true, Math.max(0, 1 - t / FADE));
      } else if (phase === 'rest') {
        draw(planeBasis(timeline.last), true, 1);
      } else {
        draw(planeBasis(plan.start), false, 1);
      }
    }

    function tick(now) {
      const t = now - phaseStart;
      if (phase === 'reduce' && t >= timeline.end) {
        setPhase('rest');
        return;
      }
      if (phase === 'fade' && t >= FADE) {
        plan = makePlan();
        timeline = schedule(plan);
        fadeIn = true;
        setPhase('reduce');
        return;
      }
      render(now);
      rafId = requestAnimationFrame(tick);
    }

    function setPhase(next) {
      cancelAnimationFrame(rafId);
      clearTimeout(restTimer);
      phase = next;
      phaseStart = performance.now();
      if (next === 'rest') {
        render();
        restTimer = setTimeout(() => {
          if (visible && !document.hidden) setPhase('fade');
          else cyclePending = true;
        }, REST);
        return;
      }
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      if (reducedMotion.matches) {
        // No animation: show the reduced basis next to the starting one.
        phase = 'rest';
        render();
        return;
      }
      fadeIn = false;
      setPhase('reduce');
    }

    function resize() {
      const css = Math.round(frame.getBoundingClientRect().width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (!css || (css === size.css && dpr === size.dpr)) return;
      size = { css, dpr };
      canvas.width = Math.round(css * dpr);
      canvas.height = Math.round(css * dpr);
      render();
    }

    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(frame);
    else window.addEventListener('resize', resize);

    const refreshColors = () => {
      colors = readColors();
      render();
    };
    document.addEventListener('votura:themechange', refreshColors);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshColors);

    // Start the first reduction when the figure comes into view; replays only run while it is visible.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) return;
        if (phase === 'idle') start();
        else if (cyclePending && !reducedMotion.matches) {
          cyclePending = false;
          setPhase('fade');
        }
      }, { threshold: 0.4 }).observe(frame);
    } else {
      visible = true;
      start();
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && visible && cyclePending && !reducedMotion.matches) {
        cyclePending = false;
        setPhase('fade');
      }
    });
  }
})();

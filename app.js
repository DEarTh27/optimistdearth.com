const toggle = document.querySelector('.menu-toggle');
const links = document.querySelector('#navigation-links');
const mobile = window.matchMedia('(max-width: 768px)');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  links.dataset.collapsed = String(mobile.matches && !open);
}
toggle.hidden = false;
setMenu(false);
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
links.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
    setMenu(false);
    toggle.focus();
  }
});
mobile.addEventListener('change', () => setMenu(false));

// A deliberate reload opens the portfolio at its starting point; back/forward stays native.
const navigationEntry = performance.getEntriesByType?.('navigation')?.[0];
if (navigationEntry?.type === 'reload' || (!navigationEntry && performance.navigation?.type === 1)) {
  window.addEventListener('load', () => window.scrollTo(0, 0), { once: true });
}

// Motion is progressive enhancement: the page remains fully visible without JS.
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!motionQuery.matches && 'IntersectionObserver' in window) {
  document.body.classList.add('motion-ready');
  const revealTargets = document.querySelectorAll(
    '.proof-inner > *, section .section-sub, .about-portrait, .about-box .card, .project, .timeline > .card, .skills .skill, .contact-card'
  );
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });

  revealTargets.forEach((element, index) => {
    element.classList.add('reveal');
    element.style.setProperty('--reveal-delay', `${Math.min(index % 5, 4) * 75}ms`);
    revealObserver.observe(element);
  });

  // These two large invitations use their own authored line choreography.
  const titleObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-kinetic');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.25, rootMargin: '0px 0px -24px 0px' });
  document.querySelectorAll('.kinetic-title').forEach(title => titleObserver.observe(title));

  // Bring the proof points in as small count-up moments.
  document.querySelectorAll('.proof-inner strong').forEach(stat => {
    const match = stat.textContent.match(/^(\d+)(.*)$/);
    if (!match) return;
    const target = Number(match[1]);
    const suffix = match[2];
    stat.textContent = `0${suffix}`;
    const counterObserver = new IntersectionObserver((entries, observer) => {
      if (!entries[0].isIntersecting) return;
      const start = performance.now();
      const duration = 1100;
      const tick = now => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        stat.textContent = `${Math.round(target * eased)}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      observer.disconnect();
    }, { threshold: 0.7 });
    counterObserver.observe(stat);
  });

  // Add gentle pointer depth where a mouse or trackpad is available.
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const art = document.querySelector('.hero-art');
    art?.addEventListener('pointermove', event => {
      const rect = art.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      art.querySelectorAll('.stack-layer').forEach((layer, index) => {
        const depth = (index + 1) * 7;
        layer.style.translate = `${x * depth}px ${y * depth}px`;
      });
      art.style.setProperty('--pointer-x', `${(x + 0.5) * 100}%`);
      art.style.setProperty('--pointer-y', `${(y + 0.5) * 100}%`);
    });
    art?.addEventListener('pointerleave', () => {
      art.querySelectorAll('.stack-layer').forEach(layer => { layer.style.translate = ''; });
    });

    document.querySelectorAll('.project').forEach(card => {
      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 3}deg`);
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 4}deg`);
        card.style.setProperty('--glow-x', `${x * 100}%`);
        card.style.setProperty('--glow-y', `${y * 100}%`);
        card.classList.add('is-pointing');
      });
      card.addEventListener('pointerleave', () => card.classList.remove('is-pointing'));
    });
  }

  // Let the three layers finish their entrance before their slower idle drift.
  const heroArt = document.querySelector('.hero-art');
  const finalLayer = heroArt?.querySelector('.layer-front');
  finalLayer?.addEventListener('animationend', event => {
    if (event.animationName === 'card-assemble-front') heroArt.classList.add('scene-settled');
  });

  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
    document.documentElement.style.setProperty('--page-progress', progress);
  };
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();
}

// Draw a low-contrast code constellation behind transparent sections.
const ambientCanvas = document.querySelector('.code-ambient');
const ambientContext = ambientCanvas?.getContext('2d');
const cursorSignal = document.querySelector('.cursor-signal');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const pointerPosition = { x: -1000, y: -1000, active: false };
const cursorFollower = { x: -1000, y: -1000, trails: [0, 1, 2].map(() => ({ x: -1000, y: -1000 })) };
let ambientWidth = 0;
let ambientHeight = 0;
let ambientDpr = 1;
let ambientNodes = [];
let ambientCodeMarks = [];
let ambientFrame = 0;

function resizeAmbient() {
  if (!ambientCanvas || !ambientContext) return;
  ambientDpr = Math.min(window.devicePixelRatio || 1, 1.5);
  ambientWidth = window.innerWidth;
  ambientHeight = window.innerHeight;
  ambientCanvas.width = Math.round(ambientWidth * ambientDpr);
  ambientCanvas.height = Math.round(ambientHeight * ambientDpr);
  ambientContext.setTransform(ambientDpr, 0, 0, ambientDpr, 0, 0);
  const count = Math.min(42, Math.max(16, Math.round(ambientWidth * ambientHeight / 45000)));
  ambientNodes = Array.from({ length: count }, () => ({
    x: Math.random() * ambientWidth,
    y: Math.random() * ambientHeight,
    vx: motionQuery.matches ? 0 : (Math.random() - .5) * .16,
    vy: motionQuery.matches ? 0 : (Math.random() - .5) * .16,
    radius: 1 + Math.random() * .7
  }));
  const marks = ['{ }', '=>', '[]', '</main>', ';'];
  ambientCodeMarks = Array.from({ length: Math.max(3, Math.round(ambientWidth / 260)) }, (_, index) => ({
    text: marks[index % marks.length],
    x: 24 + Math.random() * Math.max(1, ambientWidth - 90),
    y: 70 + Math.random() * Math.max(1, ambientHeight - 140)
  }));
  drawAmbient();
}

function drawAmbient() {
  if (!ambientContext) return;
  const ctx = ambientContext;
  ctx.clearRect(0, 0, ambientWidth, ambientHeight);
  ctx.font = "11px 'Space Grotesk', monospace";
  ctx.fillStyle = 'rgba(54, 73, 49, .18)';
  ambientCodeMarks.forEach(mark => ctx.fillText(mark.text, mark.x, mark.y));

  ambientNodes.forEach(node => {
    if (!motionQuery.matches) {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < -8) node.x = ambientWidth + 8;
      if (node.x > ambientWidth + 8) node.x = -8;
      if (node.y < -8) node.y = ambientHeight + 8;
      if (node.y > ambientHeight + 8) node.y = -8;
    }
    if (pointerPosition.active && !motionQuery.matches) {
      const dx = pointerPosition.x - node.x;
      const dy = pointerPosition.y - node.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 170 && distance > 1) {
        const pull = (1 - distance / 170) * .00035;
        node.vx += dx * pull;
        node.vy += dy * pull;
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(pointerPosition.x, pointerPosition.y);
        ctx.strokeStyle = `rgba(236, 96, 57, ${(1 - distance / 170) * .16})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    node.vx *= .92;
    node.vy *= .92;
  });

  for (let i = 0; i < ambientNodes.length; i++) {
    const a = ambientNodes[i];
    for (let j = i + 1; j < ambientNodes.length; j++) {
      const b = ambientNodes[j];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance > 145) continue;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(68, 88, 61, ${(1 - distance / 145) * .12})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ambientNodes.forEach((node, index) => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = index % 7 === 0 ? 'rgba(236, 96, 57, .34)' : 'rgba(68, 88, 61, .24)';
    ctx.fill();
  });

  if (finePointer && pointerPosition.active && cursorSignal && !motionQuery.matches) {
    const previousX = cursorFollower.x;
    const previousY = cursorFollower.y;
    cursorFollower.x += (pointerPosition.x - cursorFollower.x) * .28;
    cursorFollower.y += (pointerPosition.y - cursorFollower.y) * .28;
    const angle = Math.atan2(cursorFollower.y - previousY, cursorFollower.x - previousX) * 180 / Math.PI;
    cursorSignal.style.transform = `translate3d(${cursorFollower.x}px, ${cursorFollower.y}px, 0)`;
    cursorSignal.style.setProperty('--cursor-angle', `${angle}deg`);
    cursorFollower.trails.forEach((trail, index) => {
      const lag = .23 - index * .055;
      trail.x += (cursorFollower.x - trail.x) * lag;
      trail.y += (cursorFollower.y - trail.y) * lag;
      const trailNode = cursorSignal.querySelector(`.trail-${['one', 'two', 'three'][index]}`);
      if (trailNode) trailNode.style.transform = `translate3d(${trail.x - cursorFollower.x}px, ${trail.y - cursorFollower.y}px, 0) translate(-50%, -50%)`;
    });
  }
  if (!document.hidden && !motionQuery.matches) ambientFrame = requestAnimationFrame(drawAmbient);
}

resizeAmbient();
window.addEventListener('resize', resizeAmbient, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ambientFrame && !motionQuery.matches) {
    cancelAnimationFrame(ambientFrame);
    ambientFrame = requestAnimationFrame(drawAmbient);
  }
});

if (finePointer && cursorSignal && !motionQuery.matches) {
  document.body.classList.add('custom-cursor-ready');
  window.addEventListener('pointermove', event => {
    pointerPosition.x = event.clientX;
    pointerPosition.y = event.clientY;
    if (!pointerPosition.active) {
      cursorFollower.x = event.clientX;
      cursorFollower.y = event.clientY;
      cursorFollower.trails.forEach(trail => { trail.x = event.clientX; trail.y = event.clientY; });
    }
    pointerPosition.active = true;
    cursorSignal.classList.add('is-active');
    if (!ambientFrame) ambientFrame = requestAnimationFrame(drawAmbient);
  }, { passive: true });
  window.addEventListener('pointerleave', () => {
    pointerPosition.active = false;
    cursorSignal.classList.remove('is-active', 'is-target');
  });
  document.addEventListener('pointerover', event => {
    cursorSignal.classList.toggle('is-target', Boolean(event.target.closest('a, button')));
  });
}

document.querySelectorAll('img[data-fallback]').forEach(img => {
  function fallback() {
    const placeholder = document.createElement('div');
    placeholder.className = 'image-fallback';
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute('aria-label', img.alt);
    placeholder.textContent = img.dataset.fallback;
    img.replaceWith(placeholder);
  }
  img.addEventListener('error', fallback, { once: true });
  if (img.complete && img.naturalWidth === 0) fallback();
});

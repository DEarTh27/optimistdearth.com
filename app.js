const toggle = document.querySelector('.menu-toggle');
const links = document.querySelector('#navigation-links');
const mobile = window.matchMedia('(max-width: 768px)');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('.menu-label').textContent = open ? 'Close' : 'Menu';
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
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
let ambientStars = [];
let ambientDust = [];
let ambientConstellations = [];
let ambientGalaxies = [];
let ambientPlanetTextures = [];
let ambientFrame = 0;
let ambientSparkle = null;
let ambientShootingStar = null;
let ambientNextShootingStarAt = 0;
let ambientAircraft = null;
let ambientNextAircraftAt = 0;
let ambientSatellite = null;
let ambientNextSatelliteAt = 0;
const ambientPlanetPresets = [
  { startX: .18 + Math.random() * .64, startY: .18 + Math.random() * .64, orbitX: .095, orbitY: .05, speed: .000019, phase: Math.random() * Math.PI * 2, tilt: -.28, radius: .025, surface: 'gas', ring: true },
  { startX: .14 + Math.random() * .72, startY: .22 + Math.random() * .6, orbitX: .045, orbitY: .035, speed: -.000067, phase: Math.random() * Math.PI * 2, tilt: .16, radius: .015, surface: 'moon', ring: false },
  { startX: .16 + Math.random() * .68, startY: .16 + Math.random() * .68, orbitX: .055, orbitY: .03, speed: .00011, phase: Math.random() * Math.PI * 2, tilt: .42, radius: .011, surface: 'rust', ring: false }
];
let ambientPlanets = ambientPlanetPresets.map(planet => ({ ...planet }));
const ambientConstellationPatterns = [
  { points: [[.08,.38],[.28,.12],[.48,.4],[.68,.15],[.9,.42]], edges: [[0,1],[1,2],[2,3],[3,4]] },
  { points: [[.12,.22],[.36,.12],[.58,.28],[.38,.48],[.12,.22],[.78,.43],[.92,.67]], edges: [[0,1],[1,2],[2,3],[3,0],[2,5],[5,6]] },
  { points: [[.18,.16],[.8,.16],[.28,.46],[.67,.46],[.48,.48],[.2,.82],[.76,.82]], edges: [[0,2],[2,5],[1,3],[3,6],[2,4],[4,3]] }
];

function createPlanetTexture(surface, size = 192) {
  const texture = document.createElement('canvas');
  texture.width = size;
  texture.height = size;
  const context = texture.getContext('2d');
  const image = context.createImageData(size, size);
  for (let py = 0; py < size; py++) {
    const v = (py / (size - 1)) * 2 - 1;
    for (let px = 0; px < size; px++) {
      const u = (px / (size - 1)) * 2 - 1;
      const r2 = u * u + v * v;
      if (r2 > 1) continue;
      const z = Math.sqrt(1 - r2);
      const n1 = Math.sin(u * 7 + Math.sin(v * 5)) * Math.cos(v * 8 - u * 2);
      const n2 = Math.sin((u + v) * 19) * Math.cos((u - v) * 13);
      const n3 = Math.sin(u * 39 + v * 31) * Math.cos(v * 43 - u * 27);
      const noise = .5 + n1 * .19 + n2 * .09 + n3 * .035;
      let red, green, blue;
      if (surface === 'gas') {
        const band = Math.sin(v * 43 + n1 * 3 + n2) + Math.sin(v * 81 + n3) * .22;
        const lightBand = band > .22;
        red = lightBand ? 218 : 143;
        green = lightBand ? 169 : 91;
        blue = lightBand ? 119 : 62;
        red += noise * 34 - 17;
        green += noise * 25 - 12;
        blue += noise * 20 - 10;
      } else if (surface === 'moon') {
        const cratered = noise + Math.sin(u * 12 + v * 5) * .07;
        const relief = cratered > .59 ? 30 : cratered < .39 ? -22 : 0;
        red = 128 + relief + noise * 18;
        green = 136 + relief + noise * 18;
        blue = 151 + relief + noise * 18;
      } else {
        const value = (noise - .5) * 95;
        red = 161 + value; green = 78 + value * .72; blue = 48 + value * .45;
        if (noise > .69) { red += 25; green += 20; blue += 14; }
      }
      const light = Math.max(0, u * -.48 + v * -.34 + z * .8);
      const shade = .14 + light * .92;
      const specular = Math.pow(light, 28) * 42;
      const index = (py * size + px) * 4;
      const edge = Math.max(0, Math.min(1, (1 - Math.sqrt(r2)) * size * .8));
      image.data[index] = Math.min(255, red * shade + specular);
      image.data[index + 1] = Math.min(255, green * shade + specular);
      image.data[index + 2] = Math.min(255, blue * shade + specular);
      image.data[index + 3] = edge * 255;
    }
  }
  context.putImageData(image, 0, 0);
  return texture;
}

function createGalaxyTexture({ type, colors }) {
  const texture = document.createElement('canvas');
  texture.width = 420;
  texture.height = 260;
  const context = texture.getContext('2d');
  const cx = texture.width / 2;
  const cy = texture.height / 2;
  context.save();
  context.translate(cx, cy);
  const flattening = type === 'edge-on' ? .22 : type === 'elliptical' ? .68 : .52;
  context.scale(1, flattening);
  const halo = context.createRadialGradient(0, 0, 3, 0, 0, type === 'edge-on' ? 175 : 195);
  halo.addColorStop(0, `rgba(${colors[1]}, ${type === 'elliptical' ? .24 : .2})`);
  halo.addColorStop(.35, `rgba(${colors[0]}, .12)`);
  halo.addColorStop(1, `rgba(${colors[0]}, 0)`);
  context.fillStyle = halo;
  context.beginPath();
  context.arc(0, 0, 195, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.save();
  context.translate(cx, cy);
  context.globalCompositeOperation = 'lighter';
  if (type === 'spiral') {
    for (let arm = 0; arm < 2; arm++) {
      for (let point = 0; point < 760; point++) {
        const radius = Math.pow(Math.random(), .68) * 187;
        const angle = arm * Math.PI + radius * .052 + (Math.random() - .5) * .34;
        const spread = (Math.random() - .5) * (12 * (1 - radius / 195) + 2);
        const x = Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * spread;
        const y = (Math.sin(angle) * radius + Math.sin(angle + Math.PI / 2) * spread) * .52;
        const starFormingKnot = radius > 64 && Math.random() < .075;
        const color = starFormingKnot ? colors[2] : colors[Math.floor(Math.random() * 2)];
        const size = starFormingKnot ? Math.random() * 1.9 + .6 : Math.random() < .94 ? Math.random() * .8 + .2 : Math.random() * 1.5 + .7;
        const alpha = (.1 + Math.random() * .4) * (1 - radius / 235);
        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fillStyle = `rgba(${color}, ${alpha})`;
        context.fill();
      }
    }
    // Dust lanes trace the inner edges of the two arms.
    context.globalCompositeOperation = 'source-over';
    for (let arm = 0; arm < 2; arm++) {
      context.beginPath();
      for (let step = 0; step <= 42; step++) {
        const radius = 38 + step * 3.35;
        const angle = arm * Math.PI + radius * .052 - .09;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * .52;
        if (!step) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
      context.strokeStyle = 'rgba(7, 8, 20, .36)';
      context.lineWidth = 3.2;
      context.lineCap = 'round';
      context.stroke();
    }
  } else if (type === 'edge-on') {
    for (let point = 0; point < 1900; point++) {
      const x = (Math.random() * 2 - 1) * 185;
      const normalizedX = Math.abs(x) / 185;
      const spread = 4 + (1 - normalizedX) * 22;
      const y = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() < .96 ? Math.random() * .8 + .2 : Math.random() * 1.6 + .7;
      const alpha = (.12 + Math.random() * .36) * (1 - normalizedX * .72);
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${color}, ${alpha})`;
      context.fill();
    }
    context.globalCompositeOperation = 'source-over';
    context.beginPath();
    context.moveTo(-176, 0);
    context.bezierCurveTo(-72, -4, 64, 3, 176, 0);
    context.strokeStyle = 'rgba(5, 7, 18, .62)';
    context.lineWidth = 5;
    context.stroke();
  } else {
    for (let point = 0; point < 1550; point++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), .8) * 170;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * .68;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() < .94 ? Math.random() * .8 + .2 : Math.random() * 1.5 + .7;
      const alpha = (.08 + Math.random() * .32) * (1 - radius / 215);
      context.beginPath();
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fillStyle = `rgba(${color}, ${alpha})`;
      context.fill();
    }
  }
  const coreSize = type === 'edge-on' ? 62 : 48;
  const core = context.createRadialGradient(0, 0, 1, 0, 0, coreSize);
  core.addColorStop(0, 'rgba(255, 247, 230, .84)');
  core.addColorStop(.2, `rgba(${colors[2]}, .58)`);
  core.addColorStop(1, `rgba(${colors[1]}, 0)`);
  context.fillStyle = core;
  context.beginPath();
  context.arc(0, 0, 48, 0, Math.PI * 2);
  context.fill();
  if (type === 'spiral') {
    // A small warm companion echoes the interacting M51 / NGC 5195 pair.
    const companion = context.createRadialGradient(112, -48, 1, 112, -48, 23);
    companion.addColorStop(0, 'rgba(255, 227, 190, .46)');
    companion.addColorStop(1, 'rgba(255, 227, 190, 0)');
    context.fillStyle = companion;
    context.beginPath();
    context.ellipse(112, -48, 23, 14, -.3, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
  context.save();
  context.globalCompositeOperation = 'destination-in';
  context.translate(cx, cy);
  context.scale(1, flattening);
  const edgeFade = context.createRadialGradient(0, 0, 118, 0, 0, 207);
  edgeFade.addColorStop(0, 'rgba(255, 255, 255, 1)');
  edgeFade.addColorStop(.78, 'rgba(255, 255, 255, .82)');
  edgeFade.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = edgeFade;
  context.beginPath();
  context.arc(0, 0, 207, 0, Math.PI * 2);
  context.fill();
  context.restore();
  return texture;
}

function resizeAmbient() {
  if (!ambientCanvas || !ambientContext) return;
  ambientDpr = Math.min(window.devicePixelRatio || 1, 1.5);
  ambientWidth = window.innerWidth;
  ambientHeight = window.innerHeight;
  ambientCanvas.width = Math.round(ambientWidth * ambientDpr);
  ambientCanvas.height = Math.round(ambientHeight * ambientDpr);
  ambientContext.setTransform(ambientDpr, 0, 0, ambientDpr, 0, 0);
  const area = ambientWidth * ambientHeight;
  const compactCanvas = window.matchMedia('(max-width: 600px)').matches;
  const starCount = compactCanvas
    ? Math.min(720, Math.max(300, Math.round(area / 3000)))
    : Math.min(1100, Math.max(420, Math.round(area / 2500)));
  ambientStars = Array.from({ length: starCount }, () => ({
    x: Math.random() * ambientWidth,
    y: Math.random() * ambientHeight,
    vx: 0,
    vy: 0,
    radius: Math.random() < .94 ? Math.random() * .8 + .15 : Math.random() * 1.4 + .8,
    alpha: Math.random() * .55 + .25,
    phase: Math.random() * Math.PI * 2,
    twinkleSpeed: .002 + Math.random() * .002,
    color: ['220, 232, 255', '255, 225, 190', '188, 205, 255'][Math.floor(Math.random() * 3)]
  }));
  const dustCount = compactCanvas
    ? Math.min(1900, Math.max(700, Math.round(area / 900)))
    : Math.min(3200, Math.max(1200, Math.round(area / 650)));
  ambientDust = Array.from({ length: dustCount }, () => {
    const x = Math.random() * ambientWidth;
    const band = ambientHeight * (.48 - x / ambientWidth * .32);
    const spread = (Math.random() + Math.random() + Math.random() - 1.5) * ambientHeight * .11;
    return { x, y: band + spread, radius: Math.random() * .8 + .15, alpha: Math.random() * .085 + .012, color: Math.random() > .82 ? '255, 207, 176' : '178, 189, 255' };
  });
  ambientConstellations = ambientConstellationPatterns
    .filter(() => Math.random() < .58)
    .map(pattern => ({
    points: pattern.points,
    edges: pattern.edges,
    x: ambientWidth * (-.2 + Math.random() * 1.4),
    y: ambientHeight * (-.2 + Math.random() * 1.4),
    width: ambientWidth * (.09 + Math.random() * .045),
    height: ambientHeight * (.085 + Math.random() * .05),
    rotation: (Math.random() - .5) * .8,
    driftX: (Math.random() - .5) * .7,
    driftY: (Math.random() - .5) * .55
  }));
  const galaxyProfiles = [
    { type: 'spiral', colors: ['105, 166, 238', '104, 148, 221', '236, 139, 177'] },
    { type: 'edge-on', colors: ['142, 177, 221', '229, 203, 171', '246, 223, 194'] }
  ];
  ambientGalaxies = galaxyProfiles
    .filter(() => Math.random() < .58)
    .map(profile => {
    const index = profile.type === 'spiral' ? 0 : 1;
    const width = ambientWidth * [.16, .105][index] * (.86 + Math.random() * .28);
    return {
      texture: createGalaxyTexture(profile),
      // Overscan lets objects enter from beyond the canvas edge as the sky drifts.
      x: ambientWidth * (-.18 + Math.random() * 1.36),
      y: ambientHeight * (-.18 + Math.random() * 1.36),
      width,
      height: width * .62,
      rotation: Math.random() * Math.PI,
      alpha: [.4, .27][index] + Math.random() * .05,
      parallax: .14,
      driftX: (Math.random() - .5) * 1.4,
      driftY: (Math.random() - .5) * 1.1
    };
  });
  if (Math.random() < .38) {
    const nearWidth = ambientWidth * .29;
    ambientGalaxies.push({
      texture: createGalaxyTexture({ type: 'spiral', colors: ['161, 192, 255', '108, 147, 225', '255, 160, 190'] }),
      x: ambientWidth * (.88 + Math.random() * .34),
      y: ambientHeight * (.88 + Math.random() * .34),
      width: nearWidth,
      height: nearWidth * .62,
      rotation: Math.random() * Math.PI,
      alpha: .25,
      parallax: .82,
      driftX: (Math.random() - .5) * 1.1,
      driftY: (Math.random() - .5) * .9
    });
  }
  // Keep at least one faint galaxy in the scene, while letting each reload vary.
  if (!ambientGalaxies.length) {
    const profile = galaxyProfiles[Math.floor(Math.random() * galaxyProfiles.length)];
    const width = ambientWidth * (.075 + Math.random() * .045);
    ambientGalaxies.push({
      texture: createGalaxyTexture(profile),
      x: ambientWidth * (-.18 + Math.random() * 1.36),
      y: ambientHeight * (-.18 + Math.random() * 1.36),
      width,
      height: width * .62,
      rotation: Math.random() * Math.PI,
      alpha: .24 + Math.random() * .08,
      parallax: .14,
      driftX: (Math.random() - .5) * 1.4,
      driftY: (Math.random() - .5) * 1.1
    });
  }
  // Planets are occasional foreground visitors, not a permanent lineup.
  ambientPlanets = ambientPlanetPresets
    .map(planet => ({
      ...planet,
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - .5) * .9,
      driftY: (Math.random() - .5) * .7
    }))
    .filter(() => Math.random() < .58);
  if (!ambientPlanets.length && Math.random() < .7) {
    ambientPlanets.push({
      ...ambientPlanetPresets[Math.floor(Math.random() * ambientPlanetPresets.length)],
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - .5) * .9,
      driftY: (Math.random() - .5) * .7
    });
  }
  ambientPlanetTextures = ambientPlanets.map(planet => createPlanetTexture(planet.surface));
  ambientShootingStar = null;
  ambientNextShootingStarAt = performance.now() + 1400 + Math.random() * 2600;
  ambientAircraft = null;
  ambientSatellite = null;
  // Start one atmospheric/orbital pass immediately, then hand off without gaps.
  const firstPassAt = performance.now();
  const firstPassIsAircraft = Math.random() < .5;
  ambientNextAircraftAt = firstPassIsAircraft ? firstPassAt : Infinity;
  ambientNextSatelliteAt = firstPassIsAircraft ? Infinity : firstPassAt;
  drawAmbient();
}

function drawAmbient() {
  if (!ambientContext) return;
  const ctx = ambientContext;
  ctx.clearRect(0, 0, ambientWidth, ambientHeight);
  const space = ctx.createLinearGradient(0, 0, ambientWidth, ambientHeight);
  space.addColorStop(0, '#02030a');
  space.addColorStop(.52, '#050611');
  space.addColorStop(1, '#01030a');
  ctx.fillStyle = space;
  ctx.fillRect(0, 0, ambientWidth, ambientHeight);
  const now = performance.now();
  const wrap = (value, extent) => ((value % extent) + extent) % extent;
  const skyDriftX = motionQuery.matches ? 0 : now * .0024;
  const skyDriftY = motionQuery.matches ? 0 : now * .00048;
  // Broad nebula clouds and a diagonal Milky Way band give the sky depth.
  [
    { x: .18, y: .34, radius: .42, color: '91, 83, 205', alpha: .2 },
    { x: .58, y: .53, radius: .38, color: '164, 74, 153', alpha: .17 },
    { x: .86, y: .23, radius: .32, color: '50, 99, 183', alpha: .14 }
  ].forEach(({ x, y, radius, color }) => {
    const glowX = (ambientWidth * x + skyDriftX * .22) % ambientWidth;
    const glowY = (ambientHeight * y + skyDriftY * .22) % ambientHeight;
    const glow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.max(ambientWidth, ambientHeight) * radius);
    glow.addColorStop(0, `rgba(${color}, .12)`);
    glow.addColorStop(.48, `rgba(${color}, .035)`);
    glow.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, ambientWidth, ambientHeight);
  });
  ambientDust.forEach(dust => {
    const dustX = (dust.x + skyDriftX * .62) % ambientWidth;
    const dustY = (dust.y + skyDriftY * .62) % ambientHeight;
    ctx.beginPath();
    ctx.arc(dustX, dustY, dust.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${dust.color}, ${dust.alpha})`;
    ctx.fill();
  });
  ambientGalaxies.forEach(galaxy => {
    const seconds = now / 1000;
    const margin = Math.max(galaxy.width, galaxy.height) * .55;
    const x = wrap(galaxy.x + (skyDriftX * galaxy.parallax) + galaxy.driftX * seconds + margin, ambientWidth + margin * 2) - margin;
    const y = wrap(galaxy.y + (skyDriftY * galaxy.parallax) + galaxy.driftY * seconds + margin, ambientHeight + margin * 2) - margin;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(galaxy.rotation);
    ctx.globalAlpha = galaxy.alpha;
    ctx.drawImage(galaxy.texture, -galaxy.width / 2, -galaxy.height / 2, galaxy.width, galaxy.height);
    ctx.restore();
  });
  ambientConstellations.forEach(group => {
    const cos = Math.cos(group.rotation);
    const sin = Math.sin(group.rotation);
    const seconds = now / 1000;
    const margin = Math.max(group.width, group.height) * .55;
    const groupX = wrap(group.x + group.driftX * seconds + margin, ambientWidth + margin * 2) - margin;
    const groupY = wrap(group.y + group.driftY * seconds + margin, ambientHeight + margin * 2) - margin;
    const positions = group.points.map(([px, py]) => {
      const localX = (px - .5) * group.width;
      const localY = (py - .5) * group.height;
      return [groupX + localX * cos - localY * sin + skyDriftX * .22, groupY + localX * sin + localY * cos + skyDriftY * .22];
    });
    ctx.beginPath();
    group.edges.forEach(([from, to]) => {
      ctx.moveTo(...positions[from]);
      ctx.lineTo(...positions[to]);
    });
    ctx.strokeStyle = 'rgba(161, 197, 255, .16)';
    ctx.lineWidth = .8;
    ctx.stroke();
    positions.forEach(([x, y], index) => {
      const radius = index === 0 ? 1.45 : 1.05;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? 'rgba(230, 239, 255, .92)' : 'rgba(190, 211, 255, .72)';
      ctx.fill();
    });
  });
  if (!motionQuery.matches && ambientStars.length && (!ambientSparkle || now >= ambientSparkle.start + ambientSparkle.duration)) {
    let index = Math.floor(Math.random() * ambientStars.length);
    if (ambientStars.length > 1 && index === ambientSparkle?.index) index = (index + 1 + Math.floor(Math.random() * (ambientStars.length - 1))) % ambientStars.length;
    ambientSparkle = { index, start: now, duration: 420 + Math.random() * 180 };
  }
  const elapsed = motionQuery.matches ? 0 : now;
  const planetPositions = ambientPlanets.map(planet => {
    const angle = elapsed * planet.speed + planet.phase;
    const radius = Math.max(12, Math.min(38, ambientWidth * planet.radius));
    const margin = radius * 2.4;
    const travelX = motionQuery.matches ? 0 : now / 1000 * planet.driftX;
    const travelY = motionQuery.matches ? 0 : now / 1000 * planet.driftY;
    return {
      x: wrap(ambientWidth * planet.startX + (Math.cos(angle) + Math.cos(angle * 1.7 + planet.phase) * .12) * ambientWidth * planet.orbitX + travelX + skyDriftX * 1.5 + margin, ambientWidth + margin * 2) - margin,
      y: wrap(ambientHeight * planet.startY + (Math.sin(angle) + Math.sin(angle * 1.35 + planet.phase) * .1) * ambientHeight * planet.orbitY + travelY + skyDriftY * 1.5 + margin, ambientHeight + margin * 2) - margin,
      influenceRadius: Math.max(64, radius * 4.5),
      mass: Math.pow(radius / 28, 2) * .14
    };
  });
  const cursorRadius = cursorSignal?.classList.contains('is-target') ? 19 : 13;
  const attractors = pointerPosition.active
    ? [{ x: pointerPosition.x, y: pointerPosition.y, influenceRadius: cursorRadius * 6.5, mass: cursorRadius / 13 * .55 }]
    : [];
  ambientStars.forEach((star, index) => {
    const isSparkling = ambientSparkle?.index === index && !motionQuery.matches;
    const progress = isSparkling ? Math.min(1, (now - ambientSparkle.start) / ambientSparkle.duration) : 0;
    const pulse = isSparkling ? Math.sin(Math.PI * progress) : 0;
    const twinkle = isSparkling ? .025 + Math.pow(pulse, 1.35) * .975 : 1;
    const drift = .48 + star.radius * .3;
    let starX = (star.x + skyDriftX * drift) % ambientWidth;
    let starY = (star.y + skyDriftY * drift) % ambientHeight;
    if (!motionQuery.matches) {
      let ax = 0;
      let ay = 0;
      attractors.forEach(target => {
        const dx = target.x - starX;
        const dy = target.y - starY;
        const distance = Math.hypot(dx, dy);
        if (distance >= target.influenceRadius) return;
        const edgeFalloff = 1 - distance / target.influenceRadius;
        // Softened Newtonian gravity: acceleration approaches 1/r², with a smooth local cutoff.
        const distanceSq = dx * dx + dy * dy + 1800;
        const force = 2200 * target.mass * edgeFalloff * edgeFalloff / (distanceSq * Math.sqrt(distanceSq));
        ax += dx * force;
        ay += dy * force;
      });
      star.vx = (star.vx + ax) * .994;
      star.vy = (star.vy + ay) * .994;
      const speed = Math.hypot(star.vx, star.vy);
      if (speed > .045) { star.vx = star.vx / speed * .045; star.vy = star.vy / speed * .045; }
      star.x = (star.x + star.vx + ambientWidth) % ambientWidth;
      star.y = (star.y + star.vy + ambientHeight) % ambientHeight;
      starX = (star.x + skyDriftX * drift) % ambientWidth;
      starY = (star.y + skyDriftY * drift) % ambientHeight;
    }
    ctx.beginPath();
    ctx.arc(starX, starY, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${star.color}, ${star.alpha * twinkle})`;
    ctx.fill();
    if (isSparkling) {
      const flash = Math.pow(pulse, 1.8);
      if (flash > .015) {
        const bloom = ctx.createRadialGradient(starX, starY, 0, starX, starY, star.radius * 5);
        bloom.addColorStop(0, `rgba(${star.color}, ${flash * .48})`);
        bloom.addColorStop(1, `rgba(${star.color}, 0)`);
        ctx.fillStyle = bloom;
        ctx.fillRect(starX - star.radius * 5, starY - star.radius * 5, star.radius * 10, star.radius * 10);
      }
    }
  });
  if (!motionQuery.matches) {
    if (!ambientShootingStar && now >= ambientNextShootingStarAt) {
      const angle = Math.random() * Math.PI * 2;
      const x = ambientWidth * (.08 + Math.random() * .84);
      const y = ambientHeight * (.08 + Math.random() * .72);
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const edgeX = dx > 0 ? (ambientWidth - x) / dx : dx < 0 ? -x / dx : Infinity;
      const edgeY = dy > 0 ? (ambientHeight - y) / dy : dy < 0 ? -y / dy : Infinity;
      const distanceToEdge = Math.min(edgeX, edgeY);
      const speed = .48 + Math.random() * .2;
      const length = 100 + Math.random() * 90;
      const crossesView = Math.random() < .45;
      const burnDistance = Math.min(distanceToEdge, 250 + Math.random() * 550);
      ambientShootingStar = {
        x, y, dx, dy, speed, length, crossesView,
        start: now,
        duration: crossesView ? (distanceToEdge + length) / speed : burnDistance / (speed * .82)
      };
    }
    if (ambientShootingStar) {
      const shot = ambientShootingStar;
      const progress = (now - shot.start) / shot.duration;
      if (progress >= 1) {
        ambientShootingStar = null;
        ambientNextShootingStarAt = now + 4200 + Math.random() * 5200;
      } else {
        // A burnout fades; a meteor crossing the viewport stays luminous until its tail exits.
        const distance = shot.speed * (now - shot.start) * (shot.crossesView ? 1 : 1 - .18 * progress);
        const headX = shot.x + shot.dx * distance;
        const headY = shot.y + shot.dy * distance;
        const tailX = headX - shot.dx * shot.length;
        const tailY = headY - shot.dy * shot.length;
        const fadeIn = Math.min(1, progress / .16);
        const fadeOut = shot.crossesView ? 1 : Math.min(1, (1 - progress) / .3);
        const brightness = Math.min(fadeIn, fadeOut);
        const trail = ctx.createLinearGradient(tailX, tailY, headX, headY);
        trail.addColorStop(0, 'rgba(143, 205, 255, 0)');
        trail.addColorStop(.72, `rgba(143, 205, 255, ${brightness * .28})`);
        trail.addColorStop(1, `rgba(235, 247, 255, ${brightness * .92})`);
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(headX, headY);
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.strokeStyle = trail;
        ctx.shadowColor = 'rgba(140, 204, 255, .78)';
        ctx.shadowBlur = 9;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(headX, headY, 2.1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
        ctx.fill();
      }
    }
  }

  // Occasional aircraft in the lower atmosphere, close enough to read as a plane.
  if (!motionQuery.matches && !ambientAircraft && now >= ambientNextAircraftAt) {
    const direction = Math.random() < .5 ? 1 : -1;
    const angle = (Math.random() - .5) * .16;
    const speed = 24 + Math.random() * 12;
    const duration = (ambientWidth + 160) / speed * 1000;
    ambientAircraft = {
      start: now, duration, speed, angle, direction,
      y: ambientHeight * (.12 + Math.random() * .68),
      phase: Math.random() * Math.PI * 2
    };
  }
  if (ambientAircraft) {
    const plane = ambientAircraft;
    const progress = (now - plane.start) / plane.duration;
    if (progress >= 1) {
      ambientAircraft = null;
      const nextIsAircraft = Math.random() < .5;
      ambientNextAircraftAt = nextIsAircraft ? now : Infinity;
      ambientNextSatelliteAt = nextIsAircraft ? Infinity : now;
    } else {
      const x = plane.direction > 0 ? -80 + progress * (ambientWidth + 160) : ambientWidth + 80 - progress * (ambientWidth + 160);
      const y = plane.y + Math.sin(progress * Math.PI * 2) * 8 + Math.tan(plane.angle) * (x - ambientWidth / 2);
      const strobe = Math.pow(Math.max(0, Math.cos(now / 1000 * 2.1 + plane.phase)), 18);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(plane.angle);
      ctx.scale(plane.direction, 1);
      ctx.fillStyle = 'rgba(255, 245, 224, .96)';
      ctx.shadowColor = 'rgba(255, 225, 170, .95)';
      ctx.shadowBlur = 6 + strobe * 10;
      // Readable top-down silhouette: nose, fuselage, wings, and tailplane.
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(2, -1.1);
      ctx.lineTo(-5, -6);
      ctx.lineTo(-6, -5.6);
      ctx.lineTo(-3, -.8);
      ctx.lineTo(-8, -.8);
      ctx.lineTo(-10, -2.8);
      ctx.lineTo(-11, -2.6);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-11, 2.6);
      ctx.lineTo(-10, 2.8);
      ctx.lineTo(-8, .8);
      ctx.lineTo(-3, .8);
      ctx.lineTo(-6, 5.6);
      ctx.lineTo(-5, 6);
      ctx.lineTo(2, 1.1);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      const navPulse = .38 + .62 * Math.max(0, Math.sin(now / 1000 * 1.4 + plane.phase));
      ctx.shadowBlur = 6;
      ctx.fillStyle = `rgba(255, 55, 58, ${navPulse})`;
      ctx.fillRect(-4.5, -6.2, 2.1, 2.1);
      ctx.fillStyle = `rgba(70, 255, 150, ${navPulse})`;
      ctx.fillRect(-4.5, 4.1, 2.1, 2.1);
      ctx.fillStyle = `rgba(255, 255, 255, ${.22 + strobe * .78})`;
      ctx.fillRect(-5.5, -1, 1.5, 2);
      ctx.restore();
    }
  }

  // Satellites have a distinct cross-shaped body and solar panels, unlike aircraft lights.
  if (!motionQuery.matches && !ambientSatellite && now >= ambientNextSatelliteAt) {
    const angle = (Math.random() - .5) * .16;
    const direction = Math.random() < .5 ? 1 : -1;
    const speed = 8 + Math.random() * 7;
    const duration = (ambientWidth + 40) / (speed * Math.cos(angle)) * 1000;
    const verticalDrift = Math.abs(Math.tan(angle) * (ambientWidth + 40));
    const yMargin = Math.min(verticalDrift, ambientHeight * .35);
    ambientSatellite = {
      start: now, duration, speed, angle, direction,
      x: direction > 0 ? -20 : ambientWidth + 20,
      y: yMargin + Math.random() * Math.max(1, ambientHeight - 2 * yMargin),
      glintPhase: Math.random() * Math.PI * 2
    };
  }
  if (ambientSatellite) {
    const satellite = ambientSatellite;
    const progress = (now - satellite.start) / satellite.duration;
    if (progress >= 1) {
      ambientSatellite = null;
      const nextIsAircraft = Math.random() < .5;
      ambientNextAircraftAt = nextIsAircraft ? now : Infinity;
      ambientNextSatelliteAt = nextIsAircraft ? Infinity : now;
    } else {
      const distance = satellite.speed * (now - satellite.start) / 1000;
      const x = satellite.x + Math.cos(satellite.angle) * satellite.direction * distance;
      const y = satellite.y + Math.sin(satellite.angle) * satellite.direction * distance;
      const glint = Math.pow(Math.max(0, Math.cos(now / 1000 * .42 + satellite.glintPhase)), 12);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(satellite.angle);
      ctx.scale(satellite.direction, 1);
      ctx.globalAlpha = .72 + glint * .28;
      ctx.shadowColor = '#8ccfff';
      ctx.shadowBlur = 4 + glint * 9;
      ctx.fillStyle = '#74baf2';
      ctx.fillRect(-7, -2.2, 5, 4.4);
      ctx.fillRect(2, -2.2, 5, 4.4);
      ctx.strokeStyle = 'rgba(205, 235, 255, .8)';
      ctx.lineWidth = .65;
      ctx.strokeRect(-7, -2.2, 5, 4.4);
      ctx.strokeRect(2, -2.2, 5, 4.4);
      ctx.fillStyle = '#fff3d5';
      ctx.fillRect(-1.7, -1.8, 3.4, 3.6);
      ctx.fillStyle = `rgba(255, 255, 255, ${.35 + glint * .65})`;
      ctx.beginPath();
      ctx.arc(0, 0, 1.2 + glint * .7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  ambientPlanets.forEach((planet, index) => {
    const { x, y } = planetPositions[index];
    const radius = Math.max(12, Math.min(38, ambientWidth * planet.radius));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(planet.tilt);
    if (planet.ring) {
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.15, radius * .46, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(217, 202, 184, .38)';
      ctx.lineWidth = Math.max(2, radius * .18);
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(-radius * .35, -radius * .35, radius * .55, 0, 0, radius * 1.9);
    glow.addColorStop(0, index === 1 ? 'rgba(86, 166, 255, .17)' : 'rgba(219, 157, 255, .14)');
    glow.addColorStop(1, 'rgba(80, 110, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(ambientPlanetTextures[index], -radius, -radius, radius * 2, radius * 2);
    ctx.restore();
    if (planet.ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(planet.tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.15, radius * .46, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(238, 222, 206, .7)';
      ctx.lineWidth = Math.max(2, radius * .16);
      ctx.stroke();
      ctx.restore();
    }
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

(() => {
  const section = document.querySelector('#skills');
  const list = section?.querySelector('.sdlc-timeline');
  if (!list) return;
  const phases = [...list.querySelectorAll('.sdlc-step')];
  const cards = phases.map(phase => phase.querySelector('.sdlc-card'));
  const arrows = list.querySelectorAll('.sdlc-arrow');
  const feedback = section.querySelector('.sdlc-feedback');
  const activate = index => {
    phases.forEach((phase, i) => {
      phase.classList.toggle('is-passed', i < index);
      phase.classList.toggle('is-current', i === index);
    });
    arrows.forEach((arrow, i) => {
      arrow.classList.toggle('is-passed', i < index);
      arrow.classList.toggle('is-flowing', i === index);
    });
    feedback?.classList.toggle('is-current', index === phases.length - 1);
  };
  let currentIndex = -1;
  let frame = null;
  const syncCurrentPhase = () => {
    frame = null;
    const midpoint = window.innerHeight / 2;
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    cards.forEach((card, index) => {
      const { top, bottom } = card.getBoundingClientRect();
      const distance = Math.max(top - midpoint, midpoint - bottom, 0);
      if (distance < nearestDistance) {
        nearestIndex = index;
        nearestDistance = distance;
      }
    });
    if (nearestIndex === currentIndex) return;
    currentIndex = nearestIndex;
    activate(nearestIndex);
  };
  const scheduleSync = () => {
    if (frame === null) frame = requestAnimationFrame(syncCurrentPhase);
  };
  window.addEventListener('scroll', scheduleSync, { passive: true });
  window.addEventListener('resize', scheduleSync);
  window.addEventListener('pageshow', scheduleSync);
  syncCurrentPhase();

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const motion = gsap.matchMedia();
  motion.add('(prefers-reduced-motion: no-preference)', () => {
    // Start each effect as its heading reaches the middle of the viewport.
    const phaseStart = 'top center';
    const progress = document.createElement('span');
    progress.className = 'sdlc-progress';
    progress.setAttribute('aria-hidden', 'true');
    list.prepend(progress);
    gsap.to(progress, {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: list,
        start: phaseStart,
        end: 'bottom center',
        scrub: true
      }
    });
    phases.forEach(phase => {
      const paths = phase.querySelectorAll('.sdlc-scene path.sdlc-detail, .sdlc-scene path.sdlc-outline');
      paths.forEach(path => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: `${length} ${length}`, strokeDashoffset: length });
      });
      gsap.to(paths, {
        strokeDashoffset: 0,
        duration: 0.65,
        stagger: 0.018,
        ease: 'power2.out',
        scrollTrigger: { trigger: phase, start: phaseStart, toggleActions: 'play none none reverse' }
      });
      gsap.fromTo(phase.querySelector('.sdlc-scene'),
        { scale: 0.96, filter: 'brightness(.8)' },
        { scale: 1, filter: 'brightness(1)', duration: 0.7, ease: 'power2.out',
          scrollTrigger: { trigger: phase, start: phaseStart, toggleActions: 'play none none reverse' } }
      );
    });
    const loopPaths = feedback?.querySelectorAll('svg path');
    if (loopPaths?.length) {
      loopPaths.forEach(path => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: `${length} ${length}`, strokeDashoffset: length });
      });
      gsap.to(loopPaths, {
        strokeDashoffset: 0, stagger: 0.1, duration: 0.8, ease: 'power2.out',
        scrollTrigger: { trigger: feedback, start: phaseStart, toggleActions: 'play none none reverse' }
      });
    }
    return () => progress.remove();
  });
})();
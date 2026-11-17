(() => {
  const section = document.querySelector('#skills');
  const list = section?.querySelector('.sdlc-timeline');
  if (!section || !list || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const phases = gsap.utils.toArray('.sdlc-step', list);
  const arrows = gsap.utils.toArray('.sdlc-arrow', list);
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
  activate(0);
  const motion = gsap.matchMedia();
  motion.add('(prefers-reduced-motion: no-preference)', () => {
    const progress = document.createElement('span');
    progress.className = 'sdlc-progress';
    progress.setAttribute('aria-hidden', 'true');
    list.prepend(progress);
    gsap.to(progress, {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 68%', end: 'bottom 72%', scrub: 0.55 }
    });
    phases.forEach((phase, index) => {
      ScrollTrigger.create({
        trigger: phase,
        start: 'top 58%',
        end: 'bottom 58%',
        onEnter: () => activate(index),
        onEnterBack: () => activate(index),
        onLeaveBack: () => activate(Math.max(0, index - 1))
      });
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
        scrollTrigger: { trigger: phase, start: 'top 74%', toggleActions: 'play none none reverse' }
      });
      gsap.fromTo(phase.querySelector('.sdlc-scene'),
        { scale: 0.96, filter: 'brightness(.8)' },
        { scale: 1, filter: 'brightness(1)', duration: 0.7, ease: 'power2.out',
          scrollTrigger: { trigger: phase, start: 'top 74%', toggleActions: 'play none none reverse' } }
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
        scrollTrigger: { trigger: feedback, start: 'top 78%', toggleActions: 'play none none reverse' }
      });
    }
    return () => progress.remove();
  });
})();
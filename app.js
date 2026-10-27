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

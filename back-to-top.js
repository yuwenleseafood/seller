(() => {
  'use strict';
  const button = document.getElementById('back-to-top');
  if (!button) return;
  const updateVisibility = () => { button.hidden = window.scrollY < 360; };
  window.addEventListener('scroll', updateVisibility, { passive: true });
  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateVisibility();
})();

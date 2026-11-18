(() => {
  const menu = document.querySelector('.mobile-menu');
  if (menu) {
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.open = false; }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) {
        menu.open = false;
        menu.querySelector('summary').focus();
      }
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
  }
  const links = [...document.querySelectorAll('.desktop-nav a')];
  if ('IntersectionObserver' in window) {
    const sections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link => {
        if (link.getAttribute('href') === '#' + visible.target.id) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-12% 0px -35% 0px', threshold: [0, .1, .3] });
    sections.forEach(section => observer.observe(section));
  }
})();

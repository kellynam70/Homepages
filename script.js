const menuToggle = document.querySelector('.menu-toggle');
const siteNavigation = document.querySelector('.site-nav');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('main section[id]');

menuToggle?.addEventListener('click', () => {
  const isOpen = siteNavigation.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

navLinks.forEach((link) => {
  link.addEventListener('click', () => {
    siteNavigation.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const updateActiveLink = () => {
  const scrollPosition = window.scrollY + 180;
  let currentSection = sections[0]?.id;

  sections.forEach((section) => {
    if (scrollPosition >= section.offsetTop) currentSection = section.id;
  });

  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${currentSection}`);
  });
};

window.addEventListener('scroll', updateActiveLink, { passive: true });
updateActiveLink();

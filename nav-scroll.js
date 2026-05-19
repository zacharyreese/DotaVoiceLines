(function () {
  const header = document.querySelector('header');
  if (!header) return;

  let lastScrollTop = 0;
  const minScroll = 80;
  const scrollDelta = 5;

  window.addEventListener(
    'scroll',
    function () {
      const currentScroll =
        window.pageYOffset || document.documentElement.scrollTop;

      if (currentScroll <= 0) {
        header.classList.remove('header-hidden');
      } else if (
        currentScroll > lastScrollTop + scrollDelta &&
        currentScroll > minScroll
      ) {
        header.classList.add('header-hidden');
      } else if (currentScroll < lastScrollTop - scrollDelta) {
        header.classList.remove('header-hidden');
      }

      lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
    },
    { passive: true }
  );
})();

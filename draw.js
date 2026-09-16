function drawPathOnScroll(className, options = {}) {
  const {
    duration = 1500,
    easing = 'ease-in-out',
    threshold = 0.5,
  } = options;

  const paths = document.querySelectorAll(`.${className}`);

  paths.forEach((path) => {
    const length = path.getTotalLength();

    // Set up the starting state: fully hidden
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            path.style.transition = `stroke-dashoffset ${duration}ms ${easing}`;
            path.style.strokeDashoffset = '0';

            obs.unobserve(path); // only trigger once
          }
        });
      },
      { threshold }
    );

    observer.observe(path);
  });
}
document.addEventListener('DOMContentLoaded', () => {
  drawPathOnScroll('draw-me');
});
// Usage:

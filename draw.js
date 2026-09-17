function drawPathOnScroll(className, options = {}) {
  const {
    duration = 1500,
    easing = 'ease-in-out',
    threshold = 0.8,
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

// SVG markup for each state
const MUTED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
  <path d="M15.0848 11.9299L15.0924 1.40216C15.0924 0.628292 14.5024 0 13.7209 0C13.1846 0 12.8091 0.237525 12.2191 0.758548L7.82875 4.66622L9.16196 5.99176L12.7938 2.6894C12.8474 2.65109 12.9011 2.60511 12.9777 2.60511C13.0466 2.60511 13.1079 2.66641 13.1079 2.76602V9.94541L15.0848 11.9299ZM18.571 19.7529C18.8928 20.0824 19.4292 20.0824 19.7433 19.7529C20.0651 19.4311 20.0805 18.9024 19.7433 18.5806L1.4309 0.268174C1.10909 -0.0536344 0.56508 -0.0536344 0.23561 0.268174C-0.0785365 0.58232 -0.0785365 1.12633 0.23561 1.4558L18.571 19.7529ZM4.41912 13.8224H7.39201C7.4763 13.8224 7.56058 13.8531 7.62188 13.9067L12.2345 18.0289C12.7785 18.5193 13.1922 18.7415 13.7439 18.7415C14.2343 18.7415 14.6404 18.504 14.8855 18.0902L13.1769 16.3892L8.55665 12.2211C8.34211 12.0218 8.18887 11.9835 7.90537 11.9835H4.59535C4.23523 11.9835 4.08198 11.815 4.08198 11.4548V7.279L2.54956 5.7619C2.2584 6.13734 2.10516 6.67369 2.10516 7.37094V11.3935C2.10516 13.0179 2.8867 13.8224 4.41912 13.8224Z" fill="black"/>
</svg>`;

const UNMUTED_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="20" viewBox="0 0 14 20" fill="none">
    <path d="M2.46934 14.7506H5.64186C5.73181 14.7506 5.81357 14.7751 5.88716 14.8406L10.7931 19.2396C11.3737 19.7629 11.8234 20 12.4203 20C13.2298 20 13.8594 19.3949 13.8594 18.5691V1.49632C13.8594 0.670482 13.2298 0 12.3957 0C11.8152 0 11.4227 0.253475 10.7931 0.809485L5.88716 5.18397C5.81357 5.24939 5.73181 5.27392 5.64186 5.27392H2.46934C0.825838 5.27392 0 6.13246 0 7.8659V12.1586C0 13.8921 0.834015 14.7506 2.46934 14.7506ZM2.6574 12.7882C2.2731 12.7882 2.10957 12.6083 2.10957 12.224V7.80049C2.10957 7.41619 2.2731 7.24448 2.6574 7.24448H6.15699C6.45953 7.24448 6.68029 7.18724 6.94195 6.95012L11.4064 2.86999C11.4636 2.82911 11.5208 2.78005 11.6026 2.78005C11.6762 2.78005 11.7416 2.84546 11.7416 2.95176V17.0564C11.7416 17.1545 11.6762 17.22 11.6026 17.22C11.5372 17.22 11.48 17.1872 11.4227 17.1382L6.94195 13.0744C6.68029 12.8536 6.45953 12.7882 6.15699 12.7882H2.6574Z" fill="black"/>
</svg>`;

document.querySelectorAll('.vid-mute').forEach(button => {
    // set initial icon to match the video's actual muted state
    const frame = button.closest('.vid-frame');
    const video = frame ? frame.querySelector('.mutable-vid') : null;
    if (!video) return;

    button.innerHTML = video.muted ? MUTED_ICON : UNMUTED_ICON;

    button.addEventListener('click', () => {
        video.muted = !video.muted;
        button.innerHTML = video.muted ? MUTED_ICON : UNMUTED_ICON;
        button.classList.toggle('is-unmuted', !video.muted);
    });
});
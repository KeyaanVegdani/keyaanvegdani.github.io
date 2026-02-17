const muteBtn = document.querySelector('.mute-btn');
const video = document.querySelector('.main-vid video');
const iconMuted = muteBtn.querySelector('.icon-muted');
const iconUnmuted = muteBtn.querySelector('.icon-unmuted');

muteBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    iconMuted.style.display = video.muted ? 'block' : 'none';
    iconUnmuted.style.display = video.muted ? 'none' : 'block';
    muteBtn.querySelector('span').textContent = video.muted ? 'Unmute Video' : 'Mute Video';
});
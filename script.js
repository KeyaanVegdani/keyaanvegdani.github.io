// Define section themes
const sectionThemes = {
    'asana': {
        navBg: '#1C1C3C',
        navText: '#9CA9D0'
    },
    'google': {
        navBg: '#35494B',
        navText: '#DAE7E9'
    },
    'bawl': {
        navBg: '#181814',
        navText: '#D4D4D4'
    },
    'playground':{
        navBg: '#131314',
        navText: 'rgb(201, 201, 213)'
    }
};

// Get the nav element
const nav = document.querySelector('nav');
const sections = document.querySelectorAll('section');

function updateNavTheme() {
    const navHeight = nav.offsetHeight;
    const scrollPosition = window.scrollY + navHeight;
    
    // Find which section we're currently in
    let currentSection = null;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            currentSection = section;
        }
    });
    
    if (currentSection) {
        const sectionClass = currentSection.className.split(' ')[0];
        const theme = sectionThemes[sectionClass];
        
        if (theme) {
            // Set CSS custom properties instead of inline styles
            document.documentElement.style.setProperty('--nav-bg', theme.navBg);
            document.documentElement.style.setProperty('--nav-text', theme.navText);
        }
    }
}

window.addEventListener('scroll', updateNavTheme);
updateNavTheme();




const USERNAME = "kvegdani";
const API_KEY = "3c559fb856d05b0a101f9d7673c4a572";

const URL = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${USERNAME}&api_key=${API_KEY}&format=json&limit=1`;

let lastPlayedUnix = null;
let isNowPlaying = false;
let currentTrackName = ""; // Track identifier to detect changes

// Convert Unix timestamp to relative time
function timeAgoFromUnix(unixSeconds) {
  const secondsAgo = Math.floor(Date.now() / 1000) - unixSeconds;

  if (secondsAgo < 60) return "Just now";

  const minutes = Math.floor(secondsAgo / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

// Update the "time ago" text
function updateTimeAgo() {
  const timeEl = document.getElementById("timeAgo");

  if (isNowPlaying) {
    timeEl.classList.add("listening");

    if (lastPlayedUnix) {
      const secondsElapsed = Math.floor(Date.now() / 1000 - lastPlayedUnix);
      timeEl.textContent = `Listening Now · ${secondsElapsed}s`;
    } else {
      timeEl.textContent = "Listening Now";
    }

  } else if (lastPlayedUnix) {
    timeEl.classList.remove("listening");
    timeEl.textContent = "Played " + timeAgoFromUnix(lastPlayedUnix);
  }
}


// Fetch latest track and update UI
function fetchLatestTrack() {
  fetch(URL)
    .then(res => res.json())
    .then(data => {
      const track = data.recenttracks.track[0];

      // Detect if track changed
      const trackIdentifier = track.artist["#text"] + " - " + track.name;
      if (trackIdentifier === currentTrackName) {
        // Track hasn’t changed, just update time
        updateTimeAgo();
        return;
      }

      currentTrackName = trackIdentifier;
      isNowPlaying = !!track["@attr"]?.nowplaying;
      lastPlayedUnix = track.date?.uts ? Number(track.date.uts) : null;

      // Update song info
      document.getElementById("song").textContent = track.name;
    //   document.getElementById("artist").textContent = track.artist["#text"];

      // Album art
      const image = track.image.at(-1)["#text"];
      if (image) {
        const cover = document.getElementById("cover");
        cover.src = image;
        cover.alt = `Album cover for ${track.album["#text"]}`;
      }

      // Spotify search link
      const spotifySearch = `https://open.spotify.com/search/${encodeURIComponent(
        track.artist["#text"] + " " + track.name
      )}`;
      const link = document.getElementById("songLink");
      link.href = spotifySearch;

      // Update initial time
      updateTimeAgo();
    })
    .catch(err => console.error("Last.fm fetch error:", err));
}

// Run initially
fetchLatestTrack();

// ✅ Update every 10 seconds
setInterval(fetchLatestTrack, 10_000);

// ✅ Update "time ago" every second for live feeling
setInterval(updateTimeAgo, 1_000);



// Mouse Hover
// Select all elements you want this effect on
// Select all elements you want this effect on
const hoverElements = document.querySelectorAll(".inline-link, .tool-btn");

hoverElements.forEach(el => {
    el.addEventListener("mousemove", e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left; 
        const y = e.clientY - rect.top;

        const offsetX = (x - el.offsetWidth / 2) * 0.2; // use offsetWidth/Height
        const offsetY = (y - el.offsetHeight / 2) * 0.2;

        const maxOffset = 8;
        const finalX = Math.max(Math.min(offsetX, maxOffset), -maxOffset);
        const finalY = Math.max(Math.min(offsetY, maxOffset), -maxOffset);

        el.style.setProperty("--hover-translate-x", finalX + "px");
        el.style.setProperty("--hover-translate-y", finalY + "px");
    });

    el.addEventListener("mouseenter", () => el.classList.add("hover-active"));
    el.addEventListener("mouseleave", () => el.classList.remove("hover-active"));

    // Remove hover effect on click
    el.addEventListener("mousedown", () => el.classList.remove("hover-active"));
});





// Adding Time

const pstEl = document.getElementById("pstTime");
const emojiEl = document.getElementById("seasonEmoji");

// Return season emoji based on month
function getSeasonEmoji() {
  const month = new Date().getMonth() + 1; // 1-12

  if (month >= 3 && month <= 5) return "🌱";  // Spring
  if (month >= 6 && month <= 8) return "☀️";  // Summer
  if (month >= 9 && month <= 11) return "🍂"; // Autumn
  return "❄️";                                // Winter (Dec-Feb)
}

// Update PST clock + emoji
function updatePSTTime() {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  emojiEl.textContent = getSeasonEmoji();
  pstEl.innerHTML = `${emojiEl.outerHTML}${formatter.format(now)} | YVR`;
}

// Initial run
updatePSTTime();

// Update every second
setInterval(updatePSTTime, 1000);


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

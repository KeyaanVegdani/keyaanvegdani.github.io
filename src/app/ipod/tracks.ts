// ─── iPod songs ────────────────────────────────────────────────────────────
// The iPod's library, in Cover Flow order. Audio files live in
// public/ipod/music and covers in public/ipod/covers (any square image).
// To add a song: drop the files in those folders and add a line here.
export type Track = { title: string; artist: string; album: string; src: string; cover: string };

export const TRACKS: Track[] = [
  { title: "iPod Touch", artist: "Ninajirachi", album: "I Love My Computer", src: "/ipod/music/ipod-touch.mp3", cover: "/ipod/covers/ipod-touch.jpg" },
  { title: "WannaCry", artist: "Ninajirachi & Porter Robinson", album: "WannaCry", src: "/ipod/music/wannacry.mp3", cover: "/ipod/covers/wannacry.jpg" },
  { title: "Lovefield", artist: "underscores", album: "U", src: "/ipod/music/lovefield.mp3", cover: "/ipod/covers/lovefield.jpg" },
  { title: "START OVER", artist: "Tiffany Day", album: "START OVER", src: "/ipod/music/start-over.mp3", cover: "/ipod/covers/start-over.png" },
  { title: "CONSTANTLY", artist: "Tiffany Day ft. slayr", album: "CONSTANTLY", src: "/ipod/music/constantly.mp3", cover: "/ipod/covers/constantly.png" },
  { title: "Anaheim", artist: "NIKI", album: "Nicole", src: "/ipod/music/anaheim.mp3", cover: "/ipod/covers/anaheim.jpg" },
  { title: "HOMESICK", artist: "MICO", album: "HOMESICK", src: "/ipod/music/homesick.mp3", cover: "/ipod/covers/homesick.jpg" },
  { title: "OH!", artist: "MICO", album: "When the lights turn on", src: "/ipod/music/oh.mp3", cover: "/ipod/covers/oh.jpg" },
  { title: "buzzkill", artist: "Lyn Lapid", album: "BUZZKILL", src: "/ipod/music/buzzkill.mp3", cover: "/ipod/covers/buzzkill.jpg" },
  { title: "Texas", artist: "keshi", album: "Requiem", src: "/ipod/music/texas.mp3", cover: "/ipod/covers/texas.jpg" },
  { title: "MISS ME", artist: "keshi", album: "MISS ME", src: "/ipod/music/miss-me.mp3", cover: "/ipod/covers/miss-me.jpg" },
];

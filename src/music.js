const TRACKS = ['/mp3/01.mp3', '/mp3/02.mp3', '/mp3/03.mp3', '/mp3/04.mp3'];

let audio = null;
let playing = false;
let shuffled = [];
let currentIndex = 0;

function shuffle() {
  shuffled = [...TRACKS].sort(() => Math.random() - 0.5);
  currentIndex = 0;
}

function playNext() {
  if (!playing) return;

  if (currentIndex >= shuffled.length) {
    shuffle();
  }

  audio.src = shuffled[currentIndex];
  currentIndex++;
  audio.play().catch(() => {});
}

export function startMusic() {
  if (playing) return;

  if (!audio) {
    audio = new Audio();
    audio.volume = 0.3;
    audio.addEventListener('ended', playNext);
  }

  playing = true;
  shuffle();
  playNext();
}

export function stopMusic() {
  playing = false;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

export function toggleMusic() {
  if (playing) {
    stopMusic();
  } else {
    startMusic();
  }
  return playing;
}

export function isMusicPlaying() {
  return playing;
}

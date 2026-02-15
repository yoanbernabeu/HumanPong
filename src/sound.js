let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency, duration, type = 'square', volume = 0.15) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);

  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playWallBounce() {
  playTone(300, 0.08, 'square', 0.1);
}

export function playPaddleBounce() {
  playTone(500, 0.1, 'square', 0.15);
}

export function playScore() {
  playTone(200, 0.3, 'sawtooth', 0.12);
  setTimeout(() => playTone(150, 0.4, 'sawtooth', 0.1), 150);
}

export function playStart() {
  const notes = [440, 550, 660, 880];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.12, 'square', 0.1), i * 100);
  });
}

export function playLock() {
  playTone(800, 0.08, 'square', 0.1);
  setTimeout(() => playTone(1200, 0.12, 'square', 0.12), 80);
}

export function playWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'square', 0.12), i * 150);
  });
}

export function resumeAudio() {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

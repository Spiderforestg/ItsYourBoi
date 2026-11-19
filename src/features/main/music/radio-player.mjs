const trackFiles = [
  'a-taste-of-spring.mp3',
  'after-school-rain.mp3',
  'almost-floating.mp3',
  'amber-sidewalks.mp3',
  'amber-windowpane.mp3',
  'antenna-after-midnight.mp3',
  'ashes-in-the-coffee-cup.mp3',
  'aurora-on-mute.mp3',
];

export const RADIO_TRACKS = trackFiles.map(file => ({
  name: file.replace(/\.mp3$/, '').split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '),
  url: new URL(`../../../assets/music/lofi/${file}`, import.meta.url).href,
}));

export function createRadioPlayer(audio, onStateChange = () => {}) {
  let trackIndex = 0;
  let lastError = '';
  audio.preload = 'none';
  audio.volume = 0.6;

  function getState() {
    return {
      trackIndex,
      trackName: RADIO_TRACKS[trackIndex].name,
      volume: audio.volume,
      playing: !audio.paused && !audio.ended,
    };
  }

  function getResponse() {
    return { state: getState(), ...(lastError ? { error: lastError } : {}) };
  }

  function publish(response = getResponse()) {
    onStateChange(response);
  }

  async function startPlayback() {
    const track = RADIO_TRACKS[trackIndex];
    if (audio.getAttribute('src') !== track.url) audio.src = track.url;
    try {
      await audio.play();
      lastError = '';
    } catch (error) {
      lastError = 'Could not play this track. Try again.';
      console.error('Could not play radio track:', error);
    }
    const response = getResponse();
    publish(response);
    return response;
  }

  function clearSource() {
    if (!audio.hasAttribute('src')) return;
    audio.removeAttribute('src');
    audio.load();
  }

  async function changeTrack(offset, autoplay) {
    audio.pause();
    trackIndex = (trackIndex + offset + RADIO_TRACKS.length) % RADIO_TRACKS.length;
    lastError = '';
    publish();
    if (autoplay) return startPlayback();
    clearSource();
    return getResponse();
  }

  async function handle(action, volume) {
    if (action === 'state') return getResponse();
    if (action === 'toggle') {
      if (audio.paused) return startPlayback();
      audio.pause();
      return getResponse();
    }
    if (action === 'previous' || action === 'next') {
      const keepPlaying = !audio.paused && !audio.ended;
      return changeTrack(action === 'previous' ? -1 : 1, keepPlaying);
    }
    if (action === 'volume') {
      const nextVolume = Number(volume);
      if (!Number.isFinite(nextVolume) || nextVolume < 0 || nextVolume > 1) {
        return { state: getState(), error: 'Volume must be between 0 and 1.' };
      }
      audio.volume = nextVolume;
      lastError = '';
      const response = getResponse();
      publish(response);
      return response;
    }
    return { state: getState(), error: 'Unsupported radio command.' };
  }

  audio.addEventListener('play', () => publish());
  audio.addEventListener('pause', () => publish());
  audio.addEventListener('ended', () => { void changeTrack(1, true); });
  audio.addEventListener('error', () => {
    lastError = 'Could not load this track. Try another.';
    publish();
  });

  return { getState, handle };
}

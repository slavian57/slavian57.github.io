const seasonalStart = Date.parse('2026-12-27T00:00:00+03:00');
const seasonalEnd = Date.parse('2027-01-09T00:00:00+03:00');
const localHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const preview = localHost && new URLSearchParams(location.search).get('new-year') === 'preview';
const inSeason = () => Date.now() >= seasonalStart && Date.now() < seasonalEnd;

if (preview || inSeason()) {
  const renderer = await import('./new-year-scene.js?v=garland');
  if (preview || inSeason()) showPostcard(renderer);
}

function showPostcard({ drawFire, drawGarland, drawGreetingWindow, drawSnow, duration, loadNewYearScene, renderFrame }) {
  const container = document.getElementById('new-year');
  container.append(document.getElementById('new-year-template').content.cloneNode(true));

  const figure = container.querySelector('figure');
  const canvas = container.querySelector('canvas');
  const poster = container.querySelector('.new-year-scene img');
  const control = container.querySelector('.new-year-motion');
  const clock = container.querySelector('.new-year-code time');
  const source = container.querySelector('.new-year-code code');
  const tabs = [...container.querySelectorAll('[data-source]')];
  const functions = { frame: renderFrame, snow: drawSnow, fire: drawFire, garland: drawGarland, screen: drawGreetingWindow };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const supportsObserver = 'IntersectionObserver' in window;
  const fps = 20;
  const frameInterval = 1000 / fps;
  let playback = 'auto';
  let inView = !supportsObserver;
  let observer;
  let scene;
  let loading;
  let animation;
  let startedAt;
  let frame = 0;
  let greeting = false;
  let greetingLine;

  function showSource(tab) {
    const syntax = /('[^']*'|\b(?:function|const|let|if|for|return)\b|\b\d+(?:\.\d+)?|\.\d+)/g;
    greetingLine = undefined;
    source.replaceChildren();
    for (const line of functions[tab.dataset.source].toString().split('\n')) {
      const row = document.createElement('span');
      row.className = 'new-year-code-line';
      const text = document.createElement('span');
      text.className = 'new-year-code-text';
      for (const [index, part] of line.split(syntax).entries()) {
        if (index % 2 === 0) {
          text.append(part);
          continue;
        }
        const token = document.createElement('span');
        token.className = /^[a-z]/.test(part) ? 'new-year-keyword' : 'new-year-literal';
        token.textContent = part;
        text.append(token);
      }
      row.append(text);
      if (line.includes('const greeting =') || line.includes('const reveal =')) greetingLine = row;
      source.append(row);
    }
    if (greeting) greetingLine?.setAttribute('aria-current', 'true');
    source.parentElement.scrollTo(0, 0);
    for (const button of tabs) button.setAttribute('aria-pressed', String(button === tab));
  }

  function draw() {
    const time = frame / fps;
    const showGreeting = renderFrame(time, scene);
    const seconds = (Math.floor(time * 10) / 10).toFixed(1);
    if (clock.dateTime !== `PT${seconds}S`) {
      clock.textContent = `${seconds} с`;
      clock.dateTime = `PT${seconds}S`;
    }
    if (greeting === showGreeting) return;
    greeting = showGreeting;
    if (greeting) greetingLine?.setAttribute('aria-current', 'true');
    else greetingLine?.removeAttribute('aria-current');
  }

  function animate(timestamp) {
    startedAt ??= timestamp - frame * frameInterval;
    const next = Math.floor((timestamp - startedAt) / frameInterval) % (duration * fps);
    if (frame !== next) {
      frame = next;
      draw();
    }
    animation = requestAnimationFrame(animate);
  }

  function updateControl(playing) {
    control.toggleAttribute('data-paused', !playing);
    control.setAttribute('aria-label', playing
      ? 'Приостановить анимацию открытки'
      : 'Включить анимацию открытки');
  }

  function shouldPlay() {
    return inView && !document.hidden
      && (playback === 'play' || (playback === 'auto' && !reduceMotion.matches));
  }

  function syncPlayback() {
    const expired = !preview && Date.now() >= seasonalEnd;
    if (expired || !shouldPlay()) {
      if (animation !== undefined) cancelAnimationFrame(animation);
      animation = undefined;
      startedAt = undefined;
      updateControl(false);
      if (expired) {
        observer?.disconnect();
        listeners.abort();
        figure.remove();
      }
      return;
    }
    if (!scene) {
      loading ??= loadNewYearScene(canvas).then(loaded => {
        scene = loaded;
        draw();
        poster.hidden = true;
        canvas.hidden = false;
        syncPlayback();
      }).catch(() => { control.hidden = true; });
      return;
    }
    if (animation === undefined) {
      animation = requestAnimationFrame(animate);
      updateControl(true);
    }
  }

  for (const tab of tabs) tab.addEventListener('click', () => showSource(tab));
  showSource(tabs[0]);
  control.addEventListener('click', () => {
    playback = shouldPlay() ? 'pause' : 'play';
    syncPlayback();
  });
  document.addEventListener('visibilitychange', syncPlayback, { signal: listeners.signal });
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches && playback === 'play') playback = 'auto';
    syncPlayback();
  }, { signal: listeners.signal });

  if (supportsObserver) {
    observer = new IntersectionObserver(([entry]) => {
      inView = entry.intersectionRatio >= .35;
      syncPlayback();
    }, { threshold: .35 });
    observer.observe(container.querySelector('.new-year-scene'));
  } else {
    syncPlayback();
  }

  if (!preview) setTimeout(syncPlayback, Math.max(0, seasonalEnd - Date.now()));
  if (location.hash === '#new-year') container.scrollIntoView({ behavior: 'instant' });
}

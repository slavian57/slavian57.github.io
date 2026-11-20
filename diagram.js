const diagram = document.querySelector('.system');
const diagramMap = diagram.querySelector('.system-map');
const diagramButtons = diagram.querySelectorAll('.diagram-button');
const diagramControls = diagram.querySelectorAll('.diagram-button, .diagram-sector');
const diagramTopics = diagram.querySelectorAll('[data-topic]');
const orbit = diagram.querySelector('.diagram-loop');
const orbitTopics = Array.from(diagram.querySelectorAll('.diagram-sector'), (sector) => sector.dataset.topic);
const arcMidpoint = parseFloat(orbit.getAttribute('stroke-dasharray')) / Number(orbit.getAttribute('pathLength')) / 2;
const dotsByTopic = new Map(Array.from(diagram.querySelectorAll('.diagram-symbol'), (symbol) => [symbol.dataset.topic, createSymbolDots(symbol)]));
const revealFraction = 1 / 3;
const revealSteps = 15;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let selectedTopic = '';
let pointerInDiagram = false;
let sectorTimer;
let activeScan;

function createSymbolDots(symbol) {
  for (const use of symbol.querySelectorAll('use')) {
    const shape = diagram.querySelector(use.getAttribute('href')).cloneNode(true);
    shape.removeAttribute('id');
    shape.setAttribute('transform', `translate(${use.x.baseVal.value} ${use.y.baseVal.value})`);
    use.replaceWith(shape);
  }

  const toSymbol = symbol.getCTM().inverse();
  const dots = [];
  for (const shape of symbol.querySelectorAll('path, polyline, rect, circle')) {
    const transform = toSymbol.multiply(shape.getCTM());
    const anchor = shape.closest('.diagram-symbol-nodes');
    const length = shape.getTotalLength();
    const count = anchor ? 1 : Math.max(1, Math.round(length / 3.7));

    for (let index = 0; index < count; index++) {
      const point = anchor
        ? new DOMPoint(shape.cx.baseVal.value, shape.cy.baseVal.value)
        : shape.getPointAtLength(length * index / count);
      const position = point.matrixTransform(transform);
      const dot = document.createElementNS(symbol.namespaceURI, 'circle');
      dot.setAttribute('class', 'diagram-dot');
      dot.setAttribute('cx', position.x);
      dot.setAttribute('cy', position.y);
      dot.setAttribute('r', anchor ? shape.r.baseVal.value : .9);
      if (shape.hasAttribute('opacity')) dot.setAttribute('opacity', shape.getAttribute('opacity'));
      dots.push(dot);
    }
  }

  symbol.replaceChildren(...dots);
  return dots;
}

function showTopic(topic) {
  if (diagram.dataset.active === topic) return;

  diagram.dataset.active = topic;
  for (const item of diagramTopics) {
    item.toggleAttribute('data-current', item.dataset.topic === topic);
  }
  for (const button of diagramButtons) {
    button.setAttribute('aria-expanded', String(button.dataset.topic === topic));
  }
}

function revealSymbol(topic, fraction) {
  if (activeScan?.topic !== topic || fraction < activeScan.fraction) {
    const dots = [...dotsByTopic.get(topic)];
    for (const dot of dots) dot.removeAttribute('data-lit');
    for (let index = dots.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [dots[index], dots[other]] = [dots[other], dots[index]];
    }
    activeScan = { topic, dots, visible: 0, fraction };
  }

  const visible = Math.floor(Math.min(1, fraction / revealFraction) * activeScan.dots.length);
  while (activeScan.visible < visible) {
    activeScan.dots[activeScan.visible].setAttribute('data-lit', '');
    activeScan.visible++;
  }
  activeScan.fraction = fraction;
}

function updateAutomaticTopic() {
  clearTimeout(sectorTimer);
  const manual = pointerInDiagram || selectedTopic || diagram.querySelector(':focus-visible');
  const canScan = !manual && !reducedMotion.matches && diagram.hasAttribute('data-sweeping');
  const timing = canScan ? orbit.getAnimations()[0]?.effect?.getComputedTiming() : null;
  diagram.toggleAttribute('data-scanning', Boolean(timing));
  if (!timing) return false;
  if (timing.progress === null) {
    sectorTimer = setTimeout(updateAutomaticTopic, 16);
    return true;
  }

  // The orbit starts at the center of the top sector, half a sector before its end.
  const position = (timing.progress + arcMidpoint) * orbitTopics.length + .5;
  const sector = Math.floor(position);
  const fraction = position - sector;
  const topic = orbitTopics[sector % orbitTopics.length];
  showTopic(topic);
  revealSymbol(topic, fraction);

  const step = revealFraction / revealSteps;
  const nextScan = fraction < revealFraction ? (Math.floor(fraction / step) + 1) * step : 1;
  const remaining = (nextScan - fraction) * timing.duration / orbitTopics.length;
  sectorTimer = setTimeout(updateAutomaticTopic, Math.max(16, Math.ceil(remaining)));
  return true;
}

function restoreTopic() {
  if (pointerInDiagram || updateAutomaticTopic()) return;

  const focusedButton = diagram.querySelector('.diagram-button:focus-visible');
  showTopic(focusedButton?.dataset.topic || selectedTopic);
}

function clearTopic() {
  selectedTopic = '';
  if (!updateAutomaticTopic()) showTopic('');
}

for (const control of diagramControls) {
  const topic = control.dataset.topic;

  control.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'touch') showTopic(topic);
  });

  control.addEventListener('click', (event) => {
    selectedTopic = selectedTopic === topic ? '' : topic;
    showTopic(selectedTopic);
    updateAutomaticTopic();

    if (selectedTopic && event.pointerType === 'touch') {
      diagram.querySelector('.system-detail[data-current]').scrollIntoView({ block: 'nearest' });
    }
  });
}

for (const button of diagramButtons) {
  button.addEventListener('focus', () => {
    if (button.matches(':focus-visible')) showTopic(button.dataset.topic);
  });
}

diagram.addEventListener('pointerenter', (event) => {
  if (event.pointerType === 'touch') return;
  pointerInDiagram = true;
  updateAutomaticTopic();
});

diagram.addEventListener('pointerleave', (event) => {
  if (event.pointerType === 'touch') return;
  pointerInDiagram = false;
  restoreTopic();
});

diagram.addEventListener('focusin', updateAutomaticTopic);
diagram.addEventListener('focusout', (event) => {
  if (!diagram.contains(event.relatedTarget)) restoreTopic();
});

document.addEventListener('pointerdown', (event) => {
  if (selectedTopic && !diagram.contains(event.target)) clearTopic();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && (pointerInDiagram || selectedTopic || diagram.contains(document.activeElement))) clearTopic();
});

const motionButton = diagram.querySelector('.diagram-motion');
let orbitInView = false;

function updateOrbitMotion() {
  diagram.toggleAttribute('data-sweeping', orbitInView && !document.hidden && !motionButton.hasAttribute('data-paused'));
  updateAutomaticTopic();
}

const orbitObserver = new IntersectionObserver(([entry]) => {
  orbitInView = entry.isIntersecting;
  updateOrbitMotion();
});
orbitObserver.observe(diagramMap);

document.addEventListener('visibilitychange', updateOrbitMotion);
reducedMotion.addEventListener('change', updateAutomaticTopic);
motionButton.addEventListener('click', () => {
  const paused = motionButton.toggleAttribute('data-paused');
  motionButton.setAttribute('aria-label', paused ? 'Продолжить анимацию' : 'Приостановить анимацию');
  updateOrbitMotion();
});

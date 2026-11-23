{
  const toolkit = document.querySelector('.toolkit');
  const stage = toolkit.querySelector('.toolkit-stage');
  const mesh = stage.querySelector('.toolkit-mesh');
  const rim = mesh.querySelector('.toolkit-rim');
  const threadsBack = mesh.querySelector('.toolkit-threads-back');
  const threadsFront = mesh.querySelector('.toolkit-threads-front');
  const activeThreads = mesh.querySelector('.toolkit-threads-active');
  const knots = mesh.querySelector('.toolkit-knots');
  const links = Array.from(stage.querySelectorAll('.toolkit-tags a'));
  const descriptions = links.map(link => link.nextElementSibling.textContent);
  const tooltip = stage.querySelector('.toolkit-tooltip');
  const motionButton = toolkit.querySelector('[data-toolkit-motion]');
  const viewButton = toolkit.querySelector('[data-toolkit-view]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const points = links.map((link, index) => {
    const y = 1 - (2 * index + 1) / links.length;
    const radius = Math.sqrt(1 - y * y);
    const angle = goldenAngle * index;
    return { x: radius * Math.cos(angle), y, z: radius * Math.sin(angle), link, item: link.parentElement };
  });

  const edges = new Map();
  points.forEach((point, index) => {
    const neighbors = points.map((other, otherIndex) => ({
      index: otherIndex,
      distance: (point.x - other.x) ** 2 + (point.y - other.y) ** 2 + (point.z - other.z) ** 2,
    }));
    neighbors.sort((a, b) => a.distance - b.distance);
    for (const neighbor of neighbors.slice(1, 5)) {
      const from = Math.min(index, neighbor.index);
      const to = Math.max(index, neighbor.index);
      edges.set(`${from}:${to}`, [from, to]);
    }
  });

  const cameraDistance = 3.8;
  let angle = .48;
  let tilt = -.24;
  let width = 0;
  let height = 0;
  let radius = 0;
  let sizes = [];
  let hovered = -1;
  let focused = -1;
  let dismissed = -1;
  let pointerInside = false;
  let touching = false;
  let drag = null;
  let suppressClick = false;
  let inView = false;
  let paused = reducedMotion.matches;
  let frame = 0;
  let lastTime = 0;

  function selectedTool() {
    if (drag?.moved) return -1;
    return hovered >= 0 ? hovered : focused;
  }

  function positionTooltip() {
    const selected = selectedTool();
    if (dismissed !== selected) dismissed = -1;
    if (selected < 0 || selected === dismissed) {
      tooltip.hidden = true;
      return;
    }

    const anchor = links[selected].getBoundingClientRect();
    const { clientWidth, clientHeight } = document.documentElement;
    tooltip.hidden = anchor.bottom <= 0 || anchor.top >= clientHeight;
    if (tooltip.hidden) return;

    tooltip.textContent = descriptions[selected];
    const { width: tipWidth, height: tipHeight } = tooltip.getBoundingClientRect();
    const left = Math.min(Math.max(8, anchor.left + (anchor.width - tipWidth) / 2), clientWidth - tipWidth - 8);
    const top = anchor.bottom + tipHeight <= clientHeight - 8 ? anchor.bottom : anchor.top - tipHeight;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(8, top)}px`;
  }

  function updateSelection() {
    render();
    positionTooltip();
  }

  function render() {
    if (toolkit.dataset.view !== 'sphere' || !width || !height) return;

    const selected = selectedTool();
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const tiltSin = Math.sin(tilt);
    const tiltCos = Math.cos(tilt);
    const positions = points.map((point, index) => {
      const rotatedX = point.x * cos + point.z * sin;
      const rotatedZ = -point.x * sin + point.z * cos;
      const y = point.y * tiltCos - rotatedZ * tiltSin;
      const z = point.y * tiltSin + rotatedZ * tiltCos;
      const perspective = cameraDistance / (cameraDistance - z);
      const screenX = width / 2 + rotatedX * radius * perspective;
      const screenY = height / 2 + y * radius * perspective;
      const size = sizes[index];
      const left = Math.max(7, Math.min(width - size.width - 7, screenX - size.width / 2));
      const top = Math.max(7, Math.min(height - size.height - 7, screenY - size.height / 2));
      return { index, z, x: screenX, y: screenY, left, top, right: left + size.width, bottom: top + size.height };
    });

    // Give the frontmost labels first place, with priority for the selected term.
    const order = positions.slice().sort((a, b) => (
      Number(b.index === selected) - Number(a.index === selected) || b.z - a.z
    ));
    const visible = [];
    for (const box of order) {
      const point = points[box.index];
      const active = box.index === selected;
      const overlaps = visible.some(other => (
        box.left < other.right + 5 && box.right + 5 > other.left &&
        box.top < other.bottom + 4 && box.bottom + 4 > other.top
      ));
      const show = active || (box.z >= -.13 && !overlaps);
      if (show) visible.push(box);
      point.item.toggleAttribute('data-visible', show);
      point.link.toggleAttribute('data-highlight', active);
      point.item.style.setProperty('--tag-position', `translate3d(${box.left.toFixed(1)}px, ${box.top.toFixed(1)}px, 0)`);
    }

    const coordinate = point => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    let back = '';
    let front = '';
    let active = '';
    for (const [from, to] of edges.values()) {
      const a = positions[from];
      const b = positions[to];
      const line = `M${coordinate(a)}L${coordinate(b)}`;
      if (from === selected || to === selected) active += line;
      else if (a.z + b.z >= 0) front += line;
      else back += line;
    }
    threadsBack.setAttribute('d', back);
    threadsFront.setAttribute('d', front);
    activeThreads.setAttribute('d', active);
    knots.setAttribute('d', positions.map(point => `M${coordinate(point)}h.01`).join(''));
  }

  function measure() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    radius = Math.min(width * .36, height * .385);
    sizes = links.map(link => link.getBoundingClientRect());
    mesh.setAttribute('viewBox', `0 0 ${width} ${height}`);
    rim.setAttribute('cx', width / 2);
    rim.setAttribute('cy', height / 2);
    rim.setAttribute('r', radius * cameraDistance / Math.sqrt(cameraDistance ** 2 - 1));
    updateSelection();
  }

  function animate(time) {
    if (lastTime) angle = (angle + Math.min(time - lastTime, 40) * .00017) % (2 * Math.PI);
    lastTime = time;
    render();
    frame = requestAnimationFrame(animate);
  }

  function updateMotion() {
    const moving = toolkit.dataset.view === 'sphere' && inView && !document.hidden &&
      !paused && !pointerInside && !touching && !drag && focused < 0;
    if (moving && !frame) {
      lastTime = 0;
      frame = requestAnimationFrame(animate);
    } else if (!moving && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  function updateControls() {
    const sphere = toolkit.dataset.view === 'sphere';
    viewButton.textContent = sphere ? 'Список' : 'Сфера';
    const motionLabel = paused ? 'Включить вращение сферы' : 'Приостановить вращение сферы';
    motionButton.setAttribute('aria-label', motionLabel);
    motionButton.title = motionLabel;
    motionButton.toggleAttribute('data-paused', paused);
    motionButton.hidden = !sphere;
  }

  stage.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    pointerInside = true;
    updateMotion();
  });
  stage.addEventListener('pointerleave', () => {
    pointerInside = false;
    hovered = -1;
    updateSelection();
    updateMotion();
  });
  stage.addEventListener('pointerdown', event => {
    if (toolkit.dataset.view !== 'sphere') return;
    suppressClick = false;
    if (event.pointerType === 'touch') {
      touching = true;
    } else if (event.pointerType === 'mouse' && event.button === 0) {
      focused = -1;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, angle, tilt, moved: false };
      event.target.setPointerCapture(event.pointerId);
    }
    updateMotion();
  });
  stage.addEventListener('pointermove', event => {
    if (drag?.id !== event.pointerId) return;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      stage.setAttribute('data-dragging', '');
      positionTooltip();
    }
    angle = (drag.angle + dx / radius) % (2 * Math.PI);
    tilt = Math.max(-.4, Math.min(.4, drag.tilt - dy / radius));
    render();
  });

  function finishPointer(event) {
    if (event.pointerType === 'touch') touching = false;
    if (drag?.id === event.pointerId) {
      suppressClick = drag.moved;
      drag = null;
      stage.removeAttribute('data-dragging');
      const target = document.elementFromPoint(event.clientX, event.clientY);
      pointerInside = stage.contains(target);
      hovered = links.indexOf(target?.closest('a'));
      updateSelection();
    }
    updateMotion();
  }

  stage.addEventListener('pointerup', finishPointer);
  stage.addEventListener('pointercancel', finishPointer);
  stage.addEventListener('lostpointercapture', finishPointer);
  stage.addEventListener('dragstart', event => {
    if (drag) event.preventDefault();
  });
  stage.addEventListener('click', event => {
    if (suppressClick && event.detail > 0) {
      event.preventDefault();
      suppressClick = false;
    }
  }, true);

  links.forEach((link, index) => {
    link.addEventListener('pointerenter', event => {
      if (event.pointerType === 'touch') return;
      hovered = index;
      updateSelection();
    });
    link.addEventListener('pointerleave', event => {
      if (hovered !== index || event.relatedTarget === tooltip) return;
      hovered = -1;
      updateSelection();
    });
  });

  tooltip.addEventListener('pointerleave', event => {
    if (links[hovered]?.contains(event.relatedTarget)) return;
    hovered = -1;
    updateSelection();
  });

  stage.addEventListener('focusin', event => {
    focused = event.target.matches(':focus-visible') ? links.indexOf(event.target) : -1;
    if (focused >= 0) hovered = -1;
    updateSelection();
    updateMotion();
  });
  stage.addEventListener('focusout', event => {
    focused = event.relatedTarget?.matches(':focus-visible') ? links.indexOf(event.relatedTarget) : -1;
    updateSelection();
    updateMotion();
  });

  motionButton.addEventListener('click', () => {
    paused = !paused;
    updateControls();
    updateMotion();
  });
  viewButton.addEventListener('click', () => {
    toolkit.dataset.view = toolkit.dataset.view === 'sphere' ? 'list' : 'sphere';
    hovered = -1;
    updateControls();
    measure();
    updateMotion();
  });

  reducedMotion.addEventListener('change', () => {
    paused = reducedMotion.matches;
    updateControls();
    updateMotion();
  });
  document.addEventListener('visibilitychange', updateMotion);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || tooltip.hidden) return;
    dismissed = selectedTool();
    tooltip.hidden = true;
  });
  window.addEventListener('scroll', positionTooltip, { passive: true });
  window.addEventListener('resize', positionTooltip);

  toolkit.dataset.view = 'sphere';
  toolkit.querySelector('.toolkit-controls').hidden = false;
  updateControls();
  measure();
  new ResizeObserver(measure).observe(stage);
  if (document.fonts) document.fonts.ready.then(measure);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    updateMotion();
  }).observe(stage);
}

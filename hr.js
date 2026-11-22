const resume = document.querySelector('#resume');
const filters = resume.querySelector('.skill-filters');
const skills = resume.querySelectorAll('[data-skill]');
const status = filters.querySelector('.filter-status');
const empty = resume.querySelector('.filter-empty');

function normalizeSearch(text) {
  return text.toLowerCase().replaceAll('ё', 'е');
}

function filterSkills() {
  const area = filters.elements.area.value;
  const words = normalizeSearch(filters.elements.query.value).trim().split(/\s+/).filter(Boolean);
  let visible = 0;

  for (const skill of skills) {
    const inArea = area === 'all' || skill.dataset.skill === area;
    const text = normalizeSearch(skill.textContent);
    skill.hidden = !inArea || !words.every(word => text.includes(word));
    if (!skill.hidden) visible++;
  }

  status.textContent = `Показано ${visible} из ${skills.length}`;
  empty.hidden = visible > 0;
}

filters.addEventListener('input', filterSkills);
filters.addEventListener('submit', event => event.preventDefault());
empty.querySelector('button').addEventListener('click', () => {
  filters.reset();
  filterSkills();
  filters.elements.query.focus();
});

resume.querySelector('.resume-download').addEventListener('click', () => {
  const lines = [];
  for (const node of resume.querySelectorAll('h1, h2, h3, p, li')) {
    if (node.closest('[data-ui]')) continue;
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    const link = node.querySelector('a[data-export-url]');
    if (node.matches('h2, h3, address p:first-child')) lines.push('');
    lines.push(node.matches('li') ? `- ${text}` : text);
    if (link) lines.push(link.href);
  }

  const url = URL.createObjectURL(new Blob([lines.join('\r\n'), '\r\n'], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'vyacheslav-efimov-cv.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

resume.querySelector('.resume-print').addEventListener('click', () => window.print());
resume.querySelector('.resume-actions').hidden = false;
filters.hidden = false;
window.addEventListener('pageshow', filterSkills);
filterSkills();

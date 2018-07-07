'use strict';

document.getElementById('blacklist').value =
  Object.keys(localStorage).filter(s => s.startsWith('blacklist.')).map(s => s.substr(10)).join(', ');

document.getElementById('styles').value = atob(localStorage.getItem('styles') || '');

var add = id => {
  const tr = document.createElement('tr');
  tr.id = id;
  tr.appendChild(document.createElement('td'));
  tr.appendChild(document.createElement('td'));
  const td = document.createElement('td');
  td.textContent = '×';
  td.addEventListener('click', () => tr.remove());
  tr.appendChild(td);
  document.querySelector('tbody').appendChild(tr);

  return tr;
};

var update = (tr, hostname, style) => {
  tr.querySelector('td').textContent = hostname;
  const td = tr.querySelector('td:nth-child(2)');
  td.textContent = style;
  td.title = style;
  tr.css = style;
};

document.getElementById('custom').addEventListener('submit', e => {
  e.preventDefault();

  const eh = e.target.querySelector('[name=hostname]');
  const hostname = eh.value.toLowerCase();
  eh.value = '';
  const es = e.target.querySelector('[name=style]');
  const style = es.value;
  es.value = '';

  let tr = document.getElementById('style.' + hostname) || add('style.' + hostname);
  update(tr, hostname, style);
});

Object.keys(localStorage).filter(s => s.startsWith('style.')).forEach(s => {
  update(add(s), s.substr(6), atob(localStorage.getItem(s)));
});

document.getElementById('save').addEventListener('click', () => {
  // save blacklist
  Object.keys(localStorage).filter(s => s.startsWith('blacklist.')).forEach(s => localStorage.removeItem(s));
  document.getElementById('blacklist').value.split(/\s*,\s*/)
    .map(s => s.toLowerCase())
    .filter((s, i, l) => s && l.indexOf(s) === i).forEach(s => localStorage.setItem('blacklist.' + s, 1));
  // save user-styles
  Object.keys(localStorage).filter(s => s.startsWith('style.')).forEach(s => localStorage.removeItem(s));
  [...document.querySelectorAll('tbody tr')].forEach(tr => localStorage.setItem(
    'style.' + tr.querySelector('td').textContent,
    btoa(tr.css)
  ));
  // global styles
  localStorage.setItem('styles', btoa(document.getElementById('styles').value));
  // info
  const info = document.getElementById('info');
  info.textContent = 'Options saved';
  window.setTimeout(() => info.textContent = '', 750);
});

// fill the form
document.addEventListener('click', e => {
  if (e.target.tagName === 'TD') {
    const tr = e.target.closest('tr');
    if (tr && tr.css) {
      document.querySelector('form [name=hostname]').value = tr.querySelector('td').textContent;
      document.querySelector('form [name=style]').value = tr.css;
    }
  }
});
// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    const info = document.getElementById('info');
    window.setTimeout(() => info.textContent = '', 750);
    info.textContent = 'Double-click to reset!';
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));

'use strict';
'use strict';

var engine = {};
var startUps = [];

var notify = message => chrome.notifications.create({
  title: chrome.runtime.getManifest().name,
  message,
  type: 'basic',
  iconUrl: 'data/icons/48.png'
});

engine.policy = ({url}) => {
  if (url && url.startsWith('http')) {
    const {hostname} = new URL(url);
    if (localStorage.getItem('blacklist.' + hostname)) {
      return false;
    }
    else {
      return hostname;
    }
  }
  return false;
};


engine.execute = (d, obj) => {
  const b = engine.policy(d);
  let code = '';

  if (b !== false && !obj.code) {
    const theme = localStorage.getItem('theme');
    const sg = localStorage.getItem('styles') || '';
    const sc = localStorage.getItem('style.' + b) || '';
    console.log(atob(sc));
    code = `
      var style = document.createElement('style');
      style.id = 'global-dark-style';
      style.type = 'text/css';
      style.textContent = atob('${theme}') + '\\n' + atob('${sg}') + '\\n' + atob('${sc}');
      document.documentElement.appendChild(style);
    `;
  }

  chrome.tabs.executeScript(d.tabId || d.id, Object.assign({
    runAt: 'document_start',
    matchAboutBlank: true,
    code
  }, obj), () => chrome.runtime.lastError);
};

engine.onCommitted = d => engine.execute(d, {
  frameId: d.frameId
});

engine.style = {};
engine.style.add = tab => engine.execute(tab, {
  allFrames: true
});

engine.install = () => {
  chrome.webNavigation.onCommitted.addListener(engine.onCommitted);
  chrome.tabs.query({
    url: '*://*/*'
  }, tabs => tabs.forEach(engine.style.add));
  chrome.browserAction.setIcon({
    path: {
      '16': 'data/icons/16.png',
      '19': 'data/icons/19.png',
      '32': 'data/icons/32.png',
      '48': 'data/icons/48.png',
      '64': 'data/icons/64.png'
    }
  });
};
engine.style.remove = tab => engine.execute(tab, {
  allFrames: true,
  code: `
    [...document.querySelectorAll('style#global-dark-style')].forEach(s => s.remove());
  `
});
engine.remove = () => {
  chrome.webNavigation.onCommitted.removeListener(engine.onCommitted);
  chrome.tabs.query({
    url: '*://*/*'
  }, tabs => tabs.forEach(engine.style.remove));
  chrome.browserAction.setIcon({
    path: {
      '16': 'data/icons/disabled/16.png',
      '19': 'data/icons/disabled/19.png',
      '32': 'data/icons/disabled/32.png',
      '48': 'data/icons/disabled/48.png',
      '64': 'data/icons/disabled/64.png'
    }
  });
};

// browser action
chrome.browserAction.onClicked.addListener(() => chrome.storage.local.get({
  enabled: true
}, prefs => chrome.storage.local.set({
  enabled: prefs.enabled === false
})));

// context-menu
startUps.push(() => chrome.contextMenus.create({
  title: 'Add/remove this domain to/from the blacklist',
  contexts: ['browser_action'],
  id: 'blacklist',
  documentUrlPatterns: ['*://*/*']
}), () => chrome.contextMenus.create({
  title: 'Report an issue',
  contexts: ['browser_action'],
  id: 'report',
  documentUrlPatterns: ['*://*/*']
}));
chrome.contextMenus.onClicked.addListener((d, tab) => {
  if (d.menuItemId === 'blacklist') {
    if (tab.url.startsWith('http')) {
      const {hostname} = new URL(tab.url);
      const name = 'blacklist.' + hostname;
      chrome.tabs.query({
        url: '*://' + hostname + '/*'
      }, tabs => {
        if (localStorage.getItem(name)) {
          localStorage.removeItem(name);
          notify(`"${hostname}" is removed from the blacklist.`);
          chrome.storage.local.get({
            enabled: true
          }, prefs => {
            if (prefs.enabled) {
              tabs.forEach(tab => engine.style.add(tab));
            }
          });
        }
        else {
          localStorage.setItem(name, 1);
          notify(`"${hostname}" is added to the blacklist.`);
          tabs.forEach(tab => engine.style.remove(tab));
        }
      });
    }
    else {
      notify('This domain is not supported');
    }
  }
  else if (d.menuItemId === 'report') {
    chrome.tabs.create({
      url: chrome.runtime.getManifest()['homepage_url'] + '#reviews'
    });
  }
});

// start-up
{
  const callback = () => startUps.forEach(c => c());
  chrome.runtime.onStartup.addListener(callback);
  chrome.runtime.onInstalled.addListener(callback);
}

// load theme
var onInstalled = () => chrome.storage.local.get({
  theme: 'global-dark-style.css',
  enabled: true
}, ({theme, enabled}) => {
  fetch('data/themes/' + theme).then(r => r.text()).then(content => {
    localStorage.setItem('theme', btoa(content));
    if (enabled) {
      engine.install();
    }
  });
});

// init
startUps.push(() => chrome.storage.local.get({
  enabled: true
}, prefs => engine[prefs.enabled ? 'install' : 'remove']()));


chrome.runtime.onInstalled.addListener(onInstalled);
chrome.storage.onChanged.addListener(prefs => {
  if (prefs.enabled) {
    engine[prefs.enabled.newValue ? 'install' : 'remove']();
  }
  if (prefs.styles) {
    localStorage.setItem('styles', btoa(prefs.styles.newValue));
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const globalToggle = document.getElementById('globalToggle');
  const statTotal = document.getElementById('statTotal');
  const statHate = document.getElementById('statHate');
  const statOffensive = document.getElementById('statOffensive');
  const optionsBtn = document.getElementById('optionsBtn');

  // 1. Load active toggle status from storage
  chrome.storage.local.get({
    enabled: true
  }, (items) => {
    globalToggle.checked = items.enabled;
  });

  // 2. Load statistics from background service worker
  chrome.runtime.sendMessage({ action: 'getStats' }, (stats) => {
    if (chrome.runtime.lastError) {
      console.warn('Could not fetch stats, background script might be initializing.');
      return;
    }
    if (stats) {
      statTotal.textContent = stats.statsTotal || 0;
      statHate.textContent = stats.statsHate || 0;
      statOffensive.textContent = stats.statsOffensive || 0;
    }
  });

  // 3. Save checkbox status change to storage
  globalToggle.addEventListener('change', () => {
    chrome.storage.local.set({
      enabled: globalToggle.checked
    }, () => {
      console.log(`Global protection set to: ${globalToggle.checked}`);
    });
  });

  // 4. Open options settings page
  optionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
});

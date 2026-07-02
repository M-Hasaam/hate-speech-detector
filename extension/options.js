document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const hateSlider = document.getElementById('hateThreshold');
  const hateVal = document.getElementById('hateVal');
  const offensiveSlider = document.getElementById('offensiveThreshold');
  const offensiveVal = document.getElementById('offensiveVal');

  const platformTwitter = document.getElementById('platformTwitter');
  const platformInstagram = document.getElementById('platformInstagram');
  const platformWhatsapp = document.getElementById('platformWhatsapp');

  const labelTwitter = document.getElementById('labelTwitter');
  const labelInstagram = document.getElementById('labelInstagram');
  const labelWhatsapp = document.getElementById('labelWhatsapp');

  const keywordInput = document.getElementById('keywordInput');
  const btnAddKeyword = document.getElementById('btnAddKeyword');
  const keywordsContainer = document.getElementById('keywordsContainer');
  const emptyMessage = document.getElementById('emptyMessage');

  const btnSave = document.getElementById('btnSave');
  const btnResetStats = document.getElementById('btnResetStats');
  const statusMsg = document.getElementById('statusMsg');

  let customKeywords = [];

  // 1. Sync Slider Percentage Displays
  hateSlider.addEventListener('input', () => {
    hateVal.textContent = hateSlider.value + '%';
  });
  
  offensiveSlider.addEventListener('input', () => {
    offensiveVal.textContent = offensiveSlider.value + '%';
  });

  // 2. Manage Platform Checkbox Active Visuals
  function syncCheckboxClass(checkbox, label) {
    if (checkbox.checked) {
      label.classList.add('active');
    } else {
      label.classList.remove('active');
    }
  }

  [
    { cb: platformTwitter, lbl: labelTwitter },
    { cb: platformInstagram, lbl: labelInstagram },
    { cb: platformWhatsapp, lbl: labelWhatsapp }
  ].forEach(item => {
    item.cb.addEventListener('change', () => syncCheckboxClass(item.cb, item.lbl));
  });

  // 3. Keyword Chips Rendering
  function renderKeywords() {
    // Clear everything except empty message
    const chips = keywordsContainer.querySelectorAll('.keyword-tag');
    chips.forEach(c => c.remove());

    if (customKeywords.length === 0) {
      emptyMessage.style.display = 'block';
      return;
    }

    emptyMessage.style.display = 'none';

    customKeywords.forEach((kw, idx) => {
      const tag = document.createElement('span');
      tag.className = 'keyword-tag';
      tag.textContent = kw + ' ';
      
      const removeBtn = document.createElement('span');
      removeBtn.className = 'keyword-remove';
      removeBtn.innerHTML = '&times;';
      removeBtn.addEventListener('click', () => {
        customKeywords.splice(idx, 1);
        renderKeywords();
      });

      tag.appendChild(removeBtn);
      keywordsContainer.appendChild(tag);
    });
  }

  // Add Keyword Action
  function addKeyword() {
    const text = keywordInput.value.trim().toLowerCase();
    if (!text) return;
    
    if (customKeywords.includes(text)) {
      alert('Word is already in your blacklist!');
      keywordInput.value = '';
      return;
    }

    customKeywords.push(text);
    keywordInput.value = '';
    renderKeywords();
  }

  btnAddKeyword.addEventListener('click', addKeyword);
  keywordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addKeyword();
    }
  });

  // 4. Load Saved Configurations from Local Storage
  chrome.storage.local.get({
    hateThreshold: 0.60,
    offensiveThreshold: 0.40,
    platformTwitter: true,
    platformInstagram: true,
    platformWhatsapp: true,
    customKeywords: []
  }, (items) => {
    // Load Sliders (convert decimal ratios back to percents)
    hateSlider.value = Math.round(items.hateThreshold * 100);
    hateVal.textContent = hateSlider.value + '%';

    offensiveSlider.value = Math.round(items.offensiveThreshold * 100);
    offensiveVal.textContent = offensiveSlider.value + '%';

    // Load Checkboxes
    platformTwitter.checked = items.platformTwitter;
    platformInstagram.checked = items.platformInstagram;
    platformWhatsapp.checked = items.platformWhatsapp;

    // Sync labels active class
    syncCheckboxClass(platformTwitter, labelTwitter);
    syncCheckboxClass(platformInstagram, labelInstagram);
    syncCheckboxClass(platformWhatsapp, labelWhatsapp);

    // Load Keywords
    customKeywords = items.customKeywords;
    renderKeywords();
  });

  // 5. Save Configurations to Local Storage
  btnSave.addEventListener('click', () => {
    const hateThreshold = parseFloat(hateSlider.value) / 100;
    const offensiveThreshold = parseFloat(offensiveSlider.value) / 100;

    chrome.storage.local.set({
      hateThreshold: hateThreshold,
      offensiveThreshold: offensiveThreshold,
      platformTwitter: platformTwitter.checked,
      platformInstagram: platformInstagram.checked,
      platformWhatsapp: platformWhatsapp.checked,
      customKeywords: customKeywords
    }, () => {
      // Display Save Successful message toast
      statusMsg.className = 'status-msg visible';
      setTimeout(() => {
        statusMsg.className = 'status-msg';
      }, 2000);
    });
  });

  // 6. Reset Statistics Action
  btnResetStats.addEventListener('click', () => {
    const confirmReset = confirm('Are you sure you want to reset all moderation statistics back to 0?');
    if (confirmReset) {
      chrome.storage.local.set({
        statsTotal: 0,
        statsHate: 0,
        statsOffensive: 0
      }, () => {
        alert('Statistics successfully cleared!');
      });
    }
  });
});

const CONFIG = {
  twitter: {
    textSelector: 'div[data-testid="tweetText"]'
  },
  instagram: {
    // Captions, comments list items, and standard auto spans
    textSelector: 'span._ap3a, div._a9zs span, span[dir="auto"]'
  },
  whatsapp: {
    // Selectable texts in chats and copyable texts in message elements
    textSelector: 'span.selectable-text, div.copyable-text span'
  }
};

let platform = null;
let settings = {
  enabled: true,
  platforms: {
    twitter: true,
    instagram: true,
    whatsapp: true
  },
  customKeywords: [],
  hateThreshold: 0.60,
  offensiveThreshold: 0.40
};

// Auto-detect the current social media platform
const hostname = window.location.hostname;
if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
  platform = 'twitter';
} else if (hostname.includes('instagram.com')) {
  platform = 'instagram';
} else if (hostname.includes('whatsapp.com')) {
  platform = 'whatsapp';
}

if (platform) {
  // Load settings and initialize
  chrome.storage.local.get({
    enabled: true,
    platformTwitter: true,
    platformInstagram: true,
    platformWhatsapp: true,
    customKeywords: [],
    hateThreshold: 0.60,
    offensiveThreshold: 0.40
  }, (items) => {
    settings.enabled = items.enabled;
    settings.platforms.twitter = items.platformTwitter;
    settings.platforms.instagram = items.platformInstagram;
    settings.platforms.whatsapp = items.platformWhatsapp;
    settings.customKeywords = items.customKeywords;
    settings.hateThreshold = items.hateThreshold;
    settings.offensiveThreshold = items.offensiveThreshold;
    
    init();
  });
}

function init() {
  if (!settings.enabled || !settings.platforms[platform]) {
    console.log(`🛡️ Social Guard: Disabled for ${platform}`);
    return;
  }
  
  console.log(`🛡️ Social Guard: Active on ${platform}`);
  injectStyles();
  
  // Set up MutationObserver to scan dynamically added posts/comments
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const config = CONFIG[platform];
            
            // Check if the added node itself matches the selector
            if (node.matches && node.matches(config.textSelector)) {
              processElement(node);
            }
            
            // Search inside the added element subtree
            const elements = node.querySelectorAll(config.textSelector);
            elements.forEach(el => processElement(el));
          }
        });
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Scan any posts already visible on initial load
  const config = CONFIG[platform];
  document.querySelectorAll(config.textSelector).forEach(el => processElement(el));
}

function processElement(el) {
  if (el.dataset.socialGuardProcessed === 'true') return;
  
  const text = el.innerText ? el.innerText.trim() : '';
  if (!text || text.length < 2) return;
  
  // Mark as processed so we don't scan it in a loop
  el.dataset.socialGuardProcessed = 'true';
  
  // TIER 1: Instant Regex/Keyword Matcher (Offline/Lag-free)
  const hasBlacklistedWord = checkInstantKeywords(text);
  if (hasBlacklistedWord) {
    blurElement(el, 'offensive'); // Instantly blur
    return;
  }
  
  // TIER 2: Context Evaluation (Send message to service worker background model)
  chrome.runtime.sendMessage({
    action: 'evaluateText',
    text: text
  }, (response) => {
    if (chrome.runtime.lastError) {
      // Background worker might be initializing, ignore runtime channel disconnects
      return;
    }
    
    if (response && response.blockAction && response.blockAction !== 'none') {
      blurElement(el, response.blockAction);
    }
  });
}

function checkInstantKeywords(text) {
  if (!settings.customKeywords || settings.customKeywords.length === 0) return false;
  
  const lowerText = text.toLowerCase();
  for (const keyword of settings.customKeywords) {
    const cleanKw = keyword.trim().toLowerCase();
    if (cleanKw.length > 0) {
      // Use word boundaries \b to prevent matching substrings (e.g. "ass" matching "class")
      const regex = new RegExp('\\b' + escapeRegExp(cleanKw) + '\\b', 'i');
      if (regex.test(lowerText)) {
        return true;
      }
    }
  }
  return false;
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function blurElement(textEl, type) {
  // Prevent duplicate blur covers
  if (textEl.querySelector('.social-guard-overlay')) return;
  
  // Ensure the parent container has a positioning context for absolute positioning
  const originalPosition = window.getComputedStyle(textEl).position;
  if (originalPosition === 'static') {
    textEl.style.position = 'relative';
  }
  
  // Create wrap container for text element's existing content
  const textWrap = document.createElement('span');
  textWrap.className = 'social-guard-text-wrap social-guard-blurred';
  
  // Move all original child nodes inside the wrapper
  while (textEl.firstChild) {
    textWrap.appendChild(textEl.firstChild);
  }
  textEl.appendChild(textWrap);
  
  // Create glassmorphic Overlay card
  const overlay = document.createElement('div');
  overlay.className = 'social-guard-overlay';
  
  const title = document.createElement('div');
  title.className = `social-guard-overlay-title ${type}`;
  title.innerHTML = type === 'hate' 
    ? '🛡️ Blurred (Contains Hate Speech)' 
    : '🛡️ Blurred (Contains Offensive Content)';
  
  const btn = document.createElement('button');
  btn.className = 'social-guard-overlay-btn';
  btn.textContent = 'Reveal';
  
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Remove warning overlay
    overlay.remove();
    
    // Un-blur and restore original DOM structure
    textWrap.classList.remove('social-guard-blurred');
    while (textWrap.firstChild) {
      textEl.appendChild(textWrap.firstChild);
    }
    textWrap.remove();
  });
  
  overlay.appendChild(title);
  overlay.appendChild(btn);
  textEl.appendChild(overlay);
}

function injectStyles() {
  const style = document.createElement('style');
  style.id = 'social-guard-injected-styles';
  style.textContent = `
    .social-guard-text-wrap.social-guard-blurred {
      filter: blur(14px) !important;
      pointer-events: none !important;
      user-select: none !important;
      display: inline-block !important;
      width: 100% !important;
    }
    .social-guard-overlay {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      background: rgba(15, 12, 27, 0.85) !important;
      backdrop-filter: blur(5px) !important;
      -webkit-backdrop-filter: blur(5px) !important;
      border: 1px dashed rgba(157, 78, 221, 0.4) !important;
      border-radius: 8px !important;
      z-index: 99 !important;
      padding: 6px 14px !important;
      margin: 4px 0 !important;
      box-sizing: border-box !important;
      pointer-events: auto !important;
    }
    .social-guard-overlay-title {
      font-size: 0.85rem !important;
      font-weight: 600 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      color: #fca5a5 !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
    .social-guard-overlay-title.offensive {
      color: #fde047 !important;
    }
    .social-guard-overlay-btn {
      background: linear-gradient(135deg, #7b2cbf 0%, #9d4edd 100%) !important;
      color: white !important;
      border: none !important;
      border-radius: 6px !important;
      padding: 5px 12px !important;
      font-size: 0.8rem !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      box-shadow: 0 2px 8px rgba(157, 78, 221, 0.3) !important;
      transition: all 0.2s ease !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    .social-guard-overlay-btn:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(157, 78, 221, 0.5) !important;
    }
  `;
  document.head.appendChild(style);
}

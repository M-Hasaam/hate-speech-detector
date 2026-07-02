importScripts('predictor.js');

let predictor = null;
let initialized = false;

// Load the model weights and initialize the predictor
async function initPredictor() {
  try {
    const url = chrome.runtime.getURL('model_weights.json');
    const response = await fetch(url);
    const data = await response.json();
    
    predictor = new ToxicityPredictor();
    predictor.loadModelObject(data);
    initialized = true;
    console.log('✅ Background: ToxicityPredictor initialized successfully!');
  } catch (e) {
    console.error('❌ Background: Failed to load predictor model:', e);
  }
}

// Start initialization immediately
initPredictor();

// Handle messages from content scripts, popup, or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'evaluateText') {
    if (!initialized) {
      // Retrying if not initialized
      initPredictor().then(() => {
        if (initialized) {
          evaluateAndRespond(message, sendResponse);
        } else {
          sendResponse({ error: 'Model failed to initialize' });
        }
      });
      return true;
    }
    
    evaluateAndRespond(message, sendResponse);
    return true; // Keep message channel open for async response
  } else if (message.action === 'getStats') {
    chrome.storage.local.get({
      statsTotal: 0,
      statsHate: 0,
      statsOffensive: 0
    }, (stats) => {
      sendResponse(stats);
    });
    return true;
  }
});

function evaluateAndRespond(message, sendResponse) {
  try {
    const result = predictor.predict(message.text);
    
    // Retrieve sensitivity thresholds from settings
    chrome.storage.local.get({
      hateThreshold: 0.60,
      offensiveThreshold: 0.40,
      statsTotal: 0,
      statsHate: 0,
      statsOffensive: 0
    }, (settings) => {
      let blockAction = 'none';
      const p = result.probabilities;
      
      if (p[0] >= settings.hateThreshold) {
        blockAction = 'hate';
      } else if (p[1] >= settings.offensiveThreshold) {
        blockAction = 'offensive';
      }
      
      const newStats = {
        statsTotal: settings.statsTotal + 1
      };
      
      if (blockAction === 'hate') {
        newStats.statsHate = settings.statsHate + 1;
        chrome.storage.local.set(newStats);
      } else if (blockAction === 'offensive') {
        newStats.statsOffensive = settings.statsOffensive + 1;
        chrome.storage.local.set(newStats);
      }
      
      sendResponse({
        text: message.text,
        class: result.class,
        label: result.label,
        probabilities: result.probabilities,
        scores: result.scores,
        blockAction: blockAction
      });
    });
  } catch (e) {
    console.error('❌ Background: Prediction failed:', e);
    sendResponse({ error: e.message });
  }
}

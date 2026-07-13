console.warn('Local logistic model removed. Use the terminal BERT chatbot for predictions.');

// Handle messages from content scripts, popup, or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'evaluateText') {
    sendResponse({
      error: 'The local logistic model has been removed. Use terminal_chatbot.js with HF_TOKEN for BERT inference.'
    });
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

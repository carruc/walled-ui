document.addEventListener('DOMContentLoaded', () => {
  const submitButton = document.getElementById('submit');
  const queryTextarea = document.getElementById('query');
  const statusDiv = document.getElementById('status');

  // Get initial status when popup opens
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        statusDiv.textContent = 'Status: Error connecting';
        return;
    }
    if (response && response.status) {
        statusDiv.textContent = `Status: ${response.status}`;
    }
  });

  submitButton.addEventListener('click', () => {
    const query = queryTextarea.value;
    if (query) {
      chrome.runtime.sendMessage({ type: 'START_AGENT', query: query });
      statusDiv.textContent = 'Status: Agent started';
      window.close();
    }
  });

  // Listen for status updates from the service worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'STATUS_UPDATE') {
        statusDiv.textContent = `Status: ${request.status}`;
    }
  });
});

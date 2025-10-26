document.addEventListener('DOMContentLoaded', () => {
  const submitButton = document.getElementById('submit');
  const stopButton = document.getElementById('stop');
  const queryTextarea = document.getElementById('query');
  const statusDiv = document.getElementById('status');

  // Helper function to update UI based on agent state
  function updateUI(state) {
    switch (state) {
      case 'idle':
        submitButton.classList.remove('hidden');
        stopButton.classList.add('hidden');
        submitButton.disabled = false;
        queryTextarea.disabled = false;
        statusDiv.textContent = 'Status: Idle';
        break;
      case 'running':
        submitButton.classList.add('hidden');
        stopButton.classList.remove('hidden');
        queryTextarea.disabled = true;
        statusDiv.textContent = 'Status: Running';
        break;
      case 'awaiting_approval':
        submitButton.classList.add('hidden');
        stopButton.classList.remove('hidden');
        queryTextarea.disabled = true;
        statusDiv.textContent = 'Status: Awaiting Approval';
        break;
      case 'stopped':
        submitButton.classList.remove('hidden');
        stopButton.classList.add('hidden');
        submitButton.disabled = false;
        queryTextarea.disabled = false;
        statusDiv.textContent = 'Status: Agent Stopped';
        break;
      case 'error':
        submitButton.classList.remove('hidden');
        stopButton.classList.add('hidden');
        submitButton.disabled = false;
        queryTextarea.disabled = false;
        statusDiv.textContent = 'Status: Error';
        break;
      default:
        statusDiv.textContent = `Status: ${state}`;
    }
  }

  // Get initial status when popup opens
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        statusDiv.textContent = 'Status: Error connecting';
        return;
    }
    if (response && response.status) {
        updateUI(response.status);
    }
  });

  // Start Agent button handler
  submitButton.addEventListener('click', () => {
    const query = queryTextarea.value.trim();
    if (query) {
      chrome.runtime.sendMessage({ type: 'START_AGENT', query: query });
      updateUI('running');
      // Don't close the popup - keep it open to show status
    }
  });

  // Stop Agent button handler
  stopButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_AGENT' });
    statusDiv.textContent = 'Status: Stopping...';
    stopButton.disabled = true;
  });

  // Listen for status updates from the service worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'STATUS_UPDATE') {
        updateUI(request.status);
        stopButton.disabled = false;
    }
  });
});

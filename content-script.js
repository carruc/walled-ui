(() => {
  if (document.getElementById('walled-ui-confirmation-iframe')) {
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'walled-ui-confirmation-iframe';
  iframe.src = chrome.runtime.getURL('confirmation.html');
  iframe.style.position = 'fixed';
  iframe.style.bottom = '0';
  iframe.style.right = '0';
  iframe.style.width = '360px';
  iframe.style.height = '380px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '2147483647'; // Maximum z-index
  iframe.style.background = 'transparent';

  document.body.appendChild(iframe);

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'closeConfirmation') {
      iframe.remove();
    }
  });
})();

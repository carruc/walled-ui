document.addEventListener('DOMContentLoaded', () => {
    const title = document.getElementById('walled-ui-confirmation-title');
    const titleLink = document.getElementById('walled-ui-confirmation-title-link');
    const amount = document.getElementById('walled-ui-confirmation-amount');
    const site1Favicon = document.getElementById('walled-ui-confirmation-site1-favicon');
    const site1Name = document.getElementById('walled-ui-confirmation-site1-name');
    const site2Favicon = document.getElementById('walled-ui-confirmation-site2-favicon');
    const site2Name = document.getElementById('walled-ui-confirmation-site2-name');
    const approveButton = document.getElementById('walled-ui-confirmation-approve');
    const denyButton = document.getElementById('walled-ui-confirmation-deny');
    const blockButton = document.getElementById('walled-ui-confirmation-block');

    let originalRequest = null;

    chrome.storage.local.get('confirmationData', ({ confirmationData }) => {
        if (confirmationData) {
            originalRequest = confirmationData;

            if (confirmationData.type === 'payment_request') {
                const data = confirmationData.data;
                
                // Set title/question text
                title.textContent = data.item || 'Complete your purchase?';
                
                // Set link if available
                if (data.link) {
                    titleLink.href = data.link;
                } else {
                    titleLink.href = '#';
                    titleLink.style.pointerEvents = 'none';
                }
                
                // Set amount
                amount.textContent = `$${data.amount || '0.00'}`;
                
                // Set site information
                if (data.site1) {
                    site1Name.textContent = data.site1;
                    site1Favicon.src = `https://www.google.com/s2/favicons?domain=${data.site1Domain || data.site1}&sz=32`;
                }
                
                if (data.site2) {
                    site2Name.textContent = data.site2;
                    site2Favicon.src = `https://www.google.com/s2/favicons?domain=${data.site2Domain || data.site2}&sz=32`;
                }
            } else if (confirmationData.type === 'plan_request') {
                const data = confirmationData.data;
                
                title.textContent = 'Approve Plan?';
                amount.textContent = ''; // No amount for plan requests
                
                // Default sites for plan requests
                site1Name.textContent = 'Agent';
                site1Favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
                site2Name.textContent = 'Walled UI';
                site2Favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
            }

            // Clean up storage
            chrome.storage.local.remove('confirmationData');
        } else {
            title.textContent = 'No confirmation data found.';
        }
    });

    function sendDecision(decision) {
        if (!originalRequest) return;
        const responseType = originalRequest.type === 'plan_request' ? 'plan_response' : 'payment_response';
        chrome.runtime.sendMessage({
            type: 'CONFIRMATION_DECISION',
            decision: decision,
            response: {
                type: responseType,
                data: { decision: decision }
            }
        });
    }

    approveButton.addEventListener('click', () => sendDecision('approved'));
    denyButton.addEventListener('click', () => sendDecision('denied'));
    blockButton.addEventListener('click', () => sendDecision('blocked'));
});

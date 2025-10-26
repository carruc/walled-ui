document.addEventListener('DOMContentLoaded', () => {
    const title = document.getElementById('title');
    const detailsDiv = document.getElementById('details');
    const approveButton = document.getElementById('approve');
    const denyButton = document.getElementById('deny');

    let originalRequest = null;

    chrome.storage.local.get('confirmationData', ({ confirmationData }) => {
        if (confirmationData) {
            originalRequest = confirmationData;
            let detailsHtml = '';

            if (confirmationData.type === 'plan_request') {
                title.textContent = 'Approve Plan';
                detailsHtml = `<p><strong>Plan:</strong> ${confirmationData.data.plan}</p>`;
            } else if (confirmationData.type === 'payment_request') {
                title.textContent = 'Confirm Payment';
                detailsHtml = `<p><strong>Item:</strong> ${confirmationData.data.item}</p>
                               <p><strong>Amount:</strong> ${confirmationData.data.amount} ${confirmationData.data.currency}</p>`;
            }
            detailsDiv.innerHTML = detailsHtml;

            // Clean up storage
            chrome.storage.local.remove('confirmationData');
        } else {
            detailsDiv.textContent = 'No confirmation data found.';
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
});

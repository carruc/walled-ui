let ws = null;
let clientIdPromise = null;
let agentState = 'idle';

const API_HOST = '127.0.0.1:8000';
const WEBSOCKET_RECONNECT_DELAY = 5000; // 5 seconds
const KEEP_ALIVE_INTERVAL = 20000; // 20 seconds


function generateClientId() {
    return 'client-' + Date.now() + '-' + Math.random().toString(36).substring(2, 15);
}

function getClientId() {
    if (!clientIdPromise) {
        clientIdPromise = new Promise(async (resolve) => {
            const result = await chrome.storage.local.get('clientId');
            let id = result.clientId;
            if (!id) {
                id = generateClientId();
                await chrome.storage.local.set({ clientId: id });
            }
            resolve(id);
        });
    }
    return clientIdPromise;
}

function updateStatus(newStatus, broadcast = true) {
    agentState = newStatus;
    chrome.storage.local.set({ agentState: newStatus });
    if (newStatus === 'running') {
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else if (newStatus === 'awaiting_approval') {
        chrome.action.setBadgeText({ text: '?' });
        chrome.action.setBadgeBackgroundColor({ color: '#FFC107' });
    }
    else {
        chrome.action.setBadgeText({ text: '' });
    }
    if (broadcast) {
        chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: newStatus }).catch(e => console.log("Popup not open or background not ready"));
    }
}

async function connectWebSocket() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        return;
    }

    const clientId = await getClientId();

    ws = new WebSocket(`ws://${API_HOST}/ws/${clientId}`);

    ws.onopen = () => {
        console.log('WebSocket connection established.');
        updateStatus(agentState); // Resync status on connect
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            handleBackendMessage(message);
        } catch (error) {
            console.error('Error parsing message from backend:', event.data, error);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket connection closed. Reconnecting...');
        ws = null;
        setTimeout(connectWebSocket, WEBSOCKET_RECONNECT_DELAY);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

async function handleBackendMessage(message) {
    if (!message.type) return;

    // Handle status messages (including cancellation)
    if (message.type === 'status') {
        console.log('Received status message:', message);
        if (message.data && message.data.message) {
            const statusMessage = message.data.message;
            // Check if this is a cancellation message
            if (statusMessage.includes('cancelled') || statusMessage.includes('stopped')) {
                updateStatus('stopped');
                // Show browser notification
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icons/icon128.png',
                    title: 'Walled UI',
                    message: 'Agent execution was cancelled.',
                    priority: 1
                });
            } else if (statusMessage.includes('not approved') || statusMessage.includes('Halting')) {
                updateStatus('idle');
            }
        }
        return;
    }

    // Handle confirmation requests
    updateStatus(`awaiting_approval`);

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content-script.js']
        });
    }
    
    // Store message to be retrieved by the confirmation page
    chrome.storage.local.set({ confirmationData: message });
}


async function startAgent(query) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        await connectWebSocket();
        // Give it a moment to connect before sending
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    updateStatus('running');

    const clientId = await getClientId();

    try {
        const response = await fetch(`http://${API_HOST}/api/v1/shop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query, client_id: clientId }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.status !== 'ok') {
            console.error('Failed to start agent:', data.message);
            // Check if agent is already running - sync UI state with backend
            if (data.message && data.message.includes('already running')) {
                console.log('Agent already running, syncing UI state');
                updateStatus('running');
            } else {
                updateStatus('error');
            }
        }
    } catch (error) {
        console.error('Error starting agent:', error);
        updateStatus('error');
    }
}

async function stopAgent() {
    const clientId = await getClientId();

    try {
        const response = await fetch(`http://${API_HOST}/api/v1/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: clientId }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.status === 'ok') {
            console.log('Agent stop requested successfully');
            updateStatus('stopped');
        } else {
            console.error('Failed to stop agent:', data.message);
            updateStatus('error');
        }
    } catch (error) {
        console.error('Error stopping agent:', error);
        updateStatus('error');
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        switch (request.type) {
            case 'START_AGENT':
                await startAgent(request.query);
                break;
            case 'STOP_AGENT':
                await stopAgent();
                break;
            case 'GET_STATUS':
                sendResponse({ status: agentState });
                break;
            case 'CONFIRMATION_DECISION':
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(request.response));
                }
                const newStatus = request.decision === 'approved' ? 'running' : 'idle';
                updateStatus(newStatus);
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    chrome.tabs.sendMessage(tab.id, { action: 'closeConfirmation' });
                }
                break;
        }
    })();
    return true;
});


function keepAlive() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({type: "ping"}));
  }
}


// Initialize
chrome.runtime.onStartup.addListener(() => {
    chrome.storage.local.get(['agentState'], (result) => {
        agentState = result.agentState || 'idle';
        updateStatus(agentState, false);
        connectWebSocket();
    });
});

chrome.runtime.onInstalled.addListener(() => {
    agentState = 'idle';
    chrome.storage.local.set({ agentState });
    updateStatus(agentState, false);
    connectWebSocket();
    chrome.alarms.create('keep-alive', { periodInMinutes: 0.25 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    keepAlive();
  }
});

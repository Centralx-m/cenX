document.addEventListener('DOMContentLoaded', function() {
    const apiKeyInput = document.getElementById('apiKey');
    const apiSecretInput = document.getElementById('apiSecret');
    const apiPassphraseInput = document.getElementById('apiPassphrase');
    const tradingPairSelect = document.getElementById('tradingPair');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const statusBtn = document.getElementById('statusBtn');
    const logOutput = document.getElementById('logOutput');
    
    let botInterval = null;
    let isRunning = false;
    
    // Load available trading pairs
    fetchAvailablePairs();
    
    // Event listeners
    startBtn.addEventListener('click', startBot);
    stopBtn.addEventListener('click', stopBot);
    statusBtn.addEventListener('click', checkBotStatus);
    
    // Fetch available trading pairs from Bitget
    async function fetchAvailablePairs() {
        try {
            const response = await fetch('/api/trading/pairs');
            const data = await response.json();
            
            if (data.success && data.data) {
                data.data.forEach(pair => {
                    const option = document.createElement('option');
                    option.value = pair.symbol;
                    option.textContent = `${pair.baseCoin}/${pair.quoteCoin} (${pair.symbol})`;
                    tradingPairSelect.appendChild(option);
                });
                logMessage('Loaded available trading pairs');
            } else {
                logMessage('Failed to load trading pairs: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            logMessage('Error fetching trading pairs: ' + error.message);
        }
    }
    
    // Start the grid trading bot
    async function startBot() {
        const apiKey = apiKeyInput.value.trim();
        const apiSecret = apiSecretInput.value.trim();
        const apiPassphrase = apiPassphraseInput.value.trim();
        const tradingPair = tradingPairSelect.value;
        
        if (!apiKey || !apiSecret || !apiPassphrase) {
            logMessage('Please enter all API credentials');
            return;
        }
        
        if (!tradingPair) {
            logMessage('Please select a trading pair');
            return;
        }
        
        try {
            const response = await fetch('/api/trading/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey,
                    apiSecret,
                    apiPassphrase,
                    symbol: tradingPair,
                    gridAmount: 2, // $2 per order
                    sellPercentage: 100 // 100% sell
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                isRunning = true;
                startBtn.disabled = true;
                stopBtn.disabled = false;
                logMessage('Bot started successfully for ' + tradingPair);
                
                // Start polling for updates
                botInterval = setInterval(checkBotStatus, 5000);
            } else {
                logMessage('Failed to start bot: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            logMessage('Error starting bot: ' + error.message);
        }
    }
    
    // Stop the grid trading bot
    async function stopBot() {
        const tradingPair = tradingPairSelect.value;
        
        try {
            const response = await fetch('/api/trading/stop', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    symbol: tradingPair
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                isRunning = false;
                startBtn.disabled = false;
                stopBtn.disabled = true;
                clearInterval(botInterval);
                logMessage('Bot stopped successfully for ' + tradingPair);
            } else {
                logMessage('Failed to stop bot: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            logMessage('Error stopping bot: ' + error.message);
        }
    }
    
    // Check bot status
    async function checkBotStatus() {
        const tradingPair = tradingPairSelect.value;
        
        if (!tradingPair) {
            logMessage('Please select a trading pair to check status');
            return;
        }
        
        try {
            const response = await fetch(`/api/trading/status?symbol=${encodeURIComponent(tradingPair)}`);
            const data = await response.json();
            
            if (data.success) {
                if (data.data && data.data.isActive) {
                    logMessage(`Bot is active for ${tradingPair}. Last action: ${data.data.lastAction || 'None'}`);
                } else {
                    logMessage(`Bot is not active for ${tradingPair}`);
                }
            } else {
                logMessage('Failed to check bot status: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            logMessage('Error checking bot status: ' + error.message);
        }
    }
    
    // Helper function to log messages
    function logMessage(message) {
        const timestamp = new Date().toISOString();
        const logEntry = document.createElement('div');
        logEntry.textContent = `[${timestamp}] ${message}`;
        logOutput.appendChild(logEntry);
        logOutput.scrollTop = logOutput.scrollHeight;
    }
})

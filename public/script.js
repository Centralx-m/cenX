async function startBot() {
  const apiKey = apiKeyInput.value.trim();
  const apiSecret = apiSecretInput.value.trim();
  const apiPassphrase = apiPassphraseInput.value.trim();
  const tradingPair = tradingPairSelect.value;

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
        gridAmount: 2,
        sellPercentage: 100
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    // Handle successful start
  } catch (error) {
    console.error('Error:', error);
    // Show error to user
  }
}
// public/script.js
async function fetchMemeCoinPairs() {
  try {
    const response = await fetch('/api/pairs');
    const { data } = await response.json();
    
    tradingPairSelect.innerHTML = '<option value="">Select Meme Coin</option>';
    
    data.forEach(pair => {
      const option = document.createElement('option');
      option.value = pair.symbol;
      option.textContent = `${pair.baseCoin}/${pair.quoteCoin} (${pair.symbol})`;
      option.dataset.volatility = pair.volatility;
      
      // Color code by volatility
      if (pair.volatility > 0.8) {
        option.style.color = '#ff4757'; // High volatility - red
      } else if (pair.volatility > 0.6) {
        option.style.color = '#eccc68'; // Medium volatility - yellow
      }
      
      tradingPairSelect.appendChild(option);
    });
    
    // Add volatility disclaimer
    logMessage('⚠️ Meme coins are highly volatile - use smaller grid amounts');
  } catch (error) {
    console.error('Failed to load meme coins:', error);
    logMessage('Error loading meme coins. Retrying...');
    setTimeout(fetchMemeCoinPairs, 5000);
  }
}

// Update startBot for meme coins
async function startBot() {
  const pair = tradingPairSelect.options[tradingPairSelect.selectedIndex];
  const volatility = parseFloat(pair.dataset.volatility);
  
  // Adjust grid amount based on volatility
  const baseAmount = 2; // $2 base
  const gridAmount = (baseAmount * (1 - (volatility * 0.5))).toFixed(2); // Reduce amount for higher volatility
  
  logMessage(`Starting meme coin grid with $${gridAmount} orders (volatility: ${(volatility*100).toFixed(0)}%)`);
  
  // Rest of your start logic...
    }

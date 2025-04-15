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

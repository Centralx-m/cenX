// api/pairs.js
const BitgetAPI = require('bitget-api');

// List of popular meme coin symbols
const MEME_COINS = [
  'DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 
  'FLOKIUSDT', 'BONKUSDT', 'MEMEUSDT',
  'WIFUSDT', 'BOMEUSDT', 'COQUSDT'
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = new BitgetAPI();
    const response = await client.publicGetSpotPublicProducts();
    
    const pairs = response.data
      .filter(m => m.status === 'online' && MEME_COINS.includes(m.symbol))
      .map(m => ({
        symbol: m.symbol,
        baseCoin: m.baseCoin,
        quoteCoin: m.quoteCoin,
        minOrderAmount: m.minOrderAmount,
        volatility: calculateVolatility(m.symbol) // Custom function
      }))
      .sort((a, b) => b.volatility - a.volatility); // Most volatile first

    return res.status(200).json({ data: pairs });
  } catch (error) {
    console.error('Pairs error:', error);
    return res.status(500).json({ error: 'Failed to fetch meme coins' });
  }
}

// Mock volatility calculation - replace with real data
function calculateVolatility(symbol) {
  const volatilityMap = {
    'PEPEUSDT': 0.85,
    'SHIBUSDT': 0.78,
    'FLOKIUSDT': 0.82,
    'DOGEUSDT': 0.65,
    'BONKUSDT': 0.88,
    'MEMEUSDT': 0.75,
    'WIFUSDT': 0.90,
    'BOMEUSDT': 0.83,
    'COQUSDT': 0.87
  };
  return volatilityMap[symbol] || 0.5;
}

// api/trading.js
import authMiddleware from './auth';

export default async function handler(req, res) {
  await authMiddleware(req, res, async () => {
    try {
      const { method, body } = req;
      const { symbol, gridAmount, sellPercentage } = body;
      const credentials = req.bitgetCredentials;

      const client = new BitgetAPI(credentials);

      if (method === 'POST' && req.url === '/api/trading/start') {
        // Get current price and 24h stats
        const ticker = await client.fetchTicker(symbol);
        const stats24h = await client.fetchOHLCV(symbol, '1d', Date.now() - 86400000, 1);
        
        const currentPrice = ticker.last;
        const high24h = stats24h[0][2];
        const low24h = stats24h[0][3];
        const priceRange = high24h - low24h;
        
        // Dynamic grid configuration for meme coins
        const gridLevels = Math.min(Math.max(Math.floor(priceRange / currentPrice * 100), 5), 20);
        const gridStep = priceRange / gridLevels;
        
        // Place orders with wider spreads for volatile meme coins
        await placeMemeGridOrders(client, symbol, currentPrice, gridStep, gridAmount, sellPercentage);
        
        return res.status(200).json({ 
          success: true,
          message: `Started meme coin grid with ${gridLevels} levels`,
          gridConfig: {
            levels: gridLevels,
            step: gridStep.toFixed(8),
            currentPrice
          }
        });
      }
    } catch (error) {
      console.error('Meme coin trading error:', error);
      return res.status(500).json({ error: error.message });
    }
  });
}

async function placeMemeGridOrders(client, symbol, currentPrice, gridStep, gridAmount, sellPercentage) {
  // Cancel existing orders
  await client.cancelAllOrders(symbol);
  
  // Get precision
  const market = await client.fetchMarket(symbol);
  const pricePrecision = market.precision.price;
  const amountPrecision = market.precision.amount;
  
  // Place buy orders (5 levels below)
  for (let i = 1; i <= 5; i++) {
    const price = (currentPrice - (i * gridStep)).toFixed(pricePrecision);
    const amount = (gridAmount / price).toFixed(amountPrecision);
    
    await client.createLimitBuyOrder(symbol, amount, price, {
      reduceOnly: false
    });
  }
  
  // Place sell orders (5 levels above)
  for (let i = 1; i <= 5; i++) {
    const price = (currentPrice + (i * gridStep)).toFixed(pricePrecision);
    const amount = ((gridAmount / price) * (sellPercentage / 100)).toFixed(amountPrecision);
    
    await client.createLimitSellOrder(symbol, amount, price, {
      reduceOnly: false
    });
  }
          }
// Add to trading.js
   async function checkMemeCoinTrend(symbol) {
     const client = new BitgetAPI();
     const trades = await client.fetchTrades(symbol, since: Date.now() - 3600000);
     const buyVolume = trades.filter(t => t.side === 'buy').reduce((a, b) => a + b.amount, 0);
     const sellVolume = trades.filter(t => t.side === 'sell').reduce((a, b) => a + b.amount, 0);
     
     return {
       ratio: buyVolume / sellVolume,
       trend: buyVolume > sellVolume * 1.5 ? 'bullish' : 
              sellVolume > buyVolume * 1.5 ? 'bearish' : 'neutral'
     };
   }

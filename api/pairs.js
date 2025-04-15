const BitgetAPI = require('bitget-api');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = new BitgetAPI();
    const response = await client.publicGetSpotPublicProducts();
    
    const pairs = response.data
      .filter(m => m.status === 'online')
      .map(m => ({
        symbol: m.symbol,
        baseCoin: m.baseCoin,
        quoteCoin: m.quoteCoin,
        minOrderAmount: m.minOrderAmount
      }));

    return res.status(200).json({ data: pairs });
  } catch (error) {
    console.error('Pairs error:', error);
    return res.status(500).json({ error: 'Failed to fetch pairs' });
  }
}

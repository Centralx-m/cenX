import authMiddleware from './auth';
const BitgetAPI = require('bitget-api');

export default async function handler(req, res) {
  // Apply auth middleware first
  await authMiddleware(req, res, async () => {
    try {
      const { method } = req;
      const { symbol } = req.body;
      const credentials = req.bitgetCredentials;

      const client = new BitgetAPI({
        apiKey: credentials.apiKey,
        apiSecret: credentials.apiSecret,
        apiPassphrase: credentials.apiPassphrase,
        timeout: 10000
      });

      switch (method) {
        case 'POST':
          if (req.url === '/api/trading/start') {
            // Start grid trading logic
            const { gridAmount, sellPercentage } = req.body;
            
            // Verify minimum order amount
            const marketInfo = await client.publicGetSpotPublicProduct({
              symbol: symbol
            });
            
            if (gridAmount < marketInfo.data.minOrderAmount) {
              return res.status(400).json({
                error: `Minimum order amount is ${marketInfo.data.minOrderAmount}`
              });
            }

            // Implement your grid trading logic here
            // ...

            return res.status(200).json({ success: true });
          }
          break;

        case 'GET':
          if (req.url === '/api/trading/status') {
            // Get bot status
            // ...
          }
          break;

        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } catch (error) {
      console.error('Trading error:', error);
      return res.status(500).json({ error: error.message });
    }
  });
}

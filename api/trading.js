const BitgetAPI = require('bitget-api');

module.exports = async (req, res) => {
    const { query } = require('url').parse(req.url, true);
    const path = req.url.split('?')[0];
    
    try {
        if (req.method === 'GET' && path === '/api/trading/pairs') {
            // Initialize Bitget client without auth for public endpoints
            const client = new BitgetAPI();
            
            try {
                // Fetch all spot markets
                const markets = await client.publicGetSpotPublicProducts();
                
                if (markets && markets.data) {
                    const spotPairs = markets.data
                        .filter(market => market.status === 'online') // Only active markets
                        .map(market => ({
                            symbol: market.symbol,
                            baseCoin: market.baseCoin,
                            quoteCoin: market.quoteCoin,
                            minOrderAmount: market.minOrderAmount,
                            pricePrecision: market.pricePrecision
                        }));
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.status(200).json({
                        success: true,
                        data: spotPairs
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        message: 'No market data received from Bitget'
                    });
                }
            } catch (apiError) {
                console.error('Bitget API error:', apiError);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching pairs from Bitget: ' + apiError.message
                });
            }
        }
        // ... rest of your existing endpoints ...
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
};

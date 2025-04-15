const { createServer } = require('http');
const { parse } = require('url');
const BitgetAPI = require('bitget-api');
const { VercelRequest, VercelResponse } = require('@vercel/node');

// In-memory storage for bot state (for demo purposes)
// In a real application, use a database
const activeBots = {};

module.exports = async (req, res) => {
    const { query } = parse(req.url, true);
    const path = req.url.split('?')[0];
    
    try {
        if (req.method === 'GET' && path === '/api/trading/pairs') {
            // Get available trading pairs
            const client = new BitgetAPI();
            const symbols = await client.fetchMarkets();
            
            res.setHeader('Content-Type', 'application/json');
            res.status(200).json({
                success: true,
                data: symbols.filter(s => s.spot).map(s => ({
                    symbol: s.id,
                    baseCoin: s.base,
                    quoteCoin: s.quote
                }))
            });
        } 
        else if (req.method === 'POST' && path === '/api/trading/start') {
            // Start grid trading bot
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                const { apiKey, apiSecret, apiPassphrase, symbol, gridAmount, sellPercentage } = JSON.parse(body);
                
                const client = new BitgetAPI({
                    apiKey,
                    apiSecret,
                    apiPassphrase,
                    timeout: 30000
                });
                
                // Store bot state
                activeBots[symbol] = {
                    client,
                    isActive: true,
                    gridAmount,
                    sellPercentage,
                    lastAction: 'Bot started',
                    lastActionTime: new Date()
                };
                
                // Start grid trading logic
                startGridTrading(symbol);
                
                res.setHeader('Content-Type', 'application/json');
                res.status(200).json({
                    success: true,
                    message: 'Grid trading bot started'
                });
            });
        }
        else if (req.method === 'POST' && path === '/api/trading/stop') {
            // Stop grid trading bot
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', async () => {
                const { symbol } = JSON.parse(body);
                
                if (activeBots[symbol]) {
                    activeBots[symbol].isActive = false;
                    activeBots[symbol].lastAction = 'Bot stopped';
                    activeBots[symbol].lastActionTime = new Date();
                    
                    res.setHeader('Content-Type', 'application/json');
                    res.status(200).json({
                        success: true,
                        message: 'Grid trading bot stopped'
                    });
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.status(400).json({
                        success: false,
                        message: 'No active bot for this symbol'
                    });
                }
            });
        }
        else if (req.method === 'GET' && path === '/api/trading/status') {
            // Check bot status
            const { symbol } = query;
            
            if (activeBots[symbol]) {
                res.setHeader('Content-Type', 'application/json');
                res.status(200).json({
                    success: true,
                    data: {
                        isActive: activeBots[symbol].isActive,
                        lastAction: activeBots[symbol].lastAction,
                        lastActionTime: activeBots[symbol].lastActionTime
                    }
                });
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.status(200).json({
                    success: true,
                    data: {
                        isActive: false,
                        message: 'No active bot for this symbol'
                    }
                });
            }
        }
        else {
            res.status(404).json({ success: false, message: 'Endpoint not found' });
        }
    } catch (error) {
        console.error('API error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Grid trading logic
async function startGridTrading(symbol) {
    const bot = activeBots[symbol];
    if (!bot) return;
    
    try {
        // Get current price
        const ticker = await bot.client.fetchTicker(symbol);
        const currentPrice = ticker.last;
        
        // Place initial orders
        await placeGridOrders(bot.client, symbol, currentPrice, bot.gridAmount, bot.sellPercentage);
        
        // Update last action
        bot.lastAction = `Placed initial grid orders at price ${currentPrice}`;
        bot.lastActionTime = new Date();
        
        // Start monitoring
        monitorGrid(symbol);
    } catch (error) {
        console.error(`Error starting grid for ${symbol}:`, error);
        bot.lastAction = `Error: ${error.message}`;
        bot.lastActionTime = new Date();
    }
}

async function placeGridOrders(client, symbol, currentPrice, gridAmount, sellPercentage) {
    // Calculate grid levels (simplified example)
    const gridLevels = 5; // Number of grid levels each way
    const gridStep = currentPrice * 0.01; // 1% grid step
    
    // Cancel any existing orders
    await client.cancelAllOrders(symbol);
    
    // Place buy orders below current price
    for (let i = 1; i <= gridLevels; i++) {
        const price = currentPrice - (i * gridStep);
        const amount = gridAmount / price;
        
        await client.createOrder(symbol, 'limit', 'buy', amount, price, {
            reduceOnly: false
        });
    }
    
    // Place sell orders above current price
    for (let i = 1; i <= gridLevels; i++) {
        const price = currentPrice + (i * gridStep);
        
        // For simplicity, we assume we have the position to sell
        // In a real bot, you'd check your balance first
        const amount = (gridAmount / price) * (sellPercentage / 100);
        
        await client.createOrder(symbol, 'limit', 'sell', amount, price, {
            reduceOnly: false
        });
    }
}

async function monitorGrid(symbol) {
    const bot = activeBots[symbol];
    if (!bot || !bot.isActive) return;
    
    try {
        // Check for filled orders
        const orders = await bot.client.fetchOpenOrders(symbol);
        const trades = await bot.client.fetchMyTrades(symbol);
        
        // If any orders were filled, rebalance the grid
        if (trades.length > 0) {
            const ticker = await bot.client.fetchTicker(symbol);
            const currentPrice = ticker.last;
            
            await placeGridOrders(bot.client, symbol, currentPrice, bot.gridAmount, bot.sellPercentage);
            
            bot.lastAction = `Rebalanced grid after trade at price ${currentPrice}`;
            bot.lastActionTime = new Date();
        }
        
        // Check again in 30 seconds
        setTimeout(() => monitorGrid(symbol), 30000);
    } catch (error) {
        console.error(`Error monitoring grid for ${symbol}:`, error);
        bot.lastAction = `Monitoring error: ${error.message}`;
        bot.lastActionTime = new Date();
        
        // Retry after delay
        setTimeout(() => monitorGrid(symbol), 60000);
    }
          }

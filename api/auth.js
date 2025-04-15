const crypto = require('crypto');

// In production, use Vercel environment variables
const storedKeys = {};

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export default async function handler(req, res, next) {
  try {
    const { apiKey, apiSecret, apiPassphrase } = req.body;
    
    if (!apiKey || !apiSecret || !apiPassphrase) {
      return res.status(401).json({ error: 'Missing API credentials' });
    }

    // In production, compare with hashed keys stored in environment variables
    const keyHash = hashKey(apiKey);
    
    if (!process.env[`API_KEY_${keyHash}`]) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    // Attach verified credentials to request
    req.bitgetCredentials = {
      apiKey,
      apiSecret,
      apiPassphrase
    };

    return next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

import os
import time
import hashlib
import hmac
import base64
import json
import requests
from http import HTTPStatus
from typing import Dict, List, Optional

class BitgetAPI:
    def __init__(self):
        self.api_key = os.getenv('BITGET_API_KEY')
        self.secret_key = os.getenv('BITGET_SECRET_KEY')
        self.passphrase = os.getenv('BITGET_PASSPHRASE')
        self.base_url = 'https://api.bitget.com'
    
    def _generate_signature(self, timestamp: str, method: str, request_path: str, body: str = '') -> str:
        """Generate Bitget API signature."""
        message = timestamp + method.upper() + request_path + (body if body else '')
        mac = hmac.new(
            self.secret_key.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        )
        return base64.b64encode(mac.digest()).decode('utf-8')
    
    def request(self, method: str, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make authenticated request to Bitget API."""
        timestamp = str(int(time.time() * 1000))
        body = json.dumps(params) if params else ''
        
        headers = {
            'Content-Type': 'application/json',
            'ACCESS-KEY': self.api_key,
            'ACCESS-SIGN': self._generate_signature(timestamp, method, endpoint, body),
            'ACCESS-TIMESTAMP': timestamp,
            'ACCESS-PASSPHRASE': self.passphrase,
            'locale': 'en-US'
        }
        
        response = requests.request(
            method,
            self.base_url + endpoint,
            headers=headers,
            data=body
        )
        
        if response.status_code != HTTPStatus.OK:
            raise Exception(f"Bitget API error: {response.text}")
        
        return response.json()
    
    def get_all_symbols(self) -> List[str]:
        """Get all available trading pairs on Bitget."""
        response = self.request('GET', '/api/mix/v1/market/contracts', {
            'productType': 'umcbl'  # USDT-Margined Contracts
        })
        return [item['symbol'] for item in response['data']]
    
    def get_current_price(self, symbol: str) -> float:
        """Get current market price for a symbol."""
        response = self.request('GET', f'/api/mix/v1/market/ticker?symbol={symbol}')
        return float(response['data']['last'])￼Enter

from http import HTTPStatus
import json
from typing import Dict

from .bitget_api import BitgetAPI
from .strategies import GridStrategy

def handler(event, context):
    """Vercel serverless function handler for grid trading."""
    try:
        # Initialize Bitget API
        bitget = BitgetAPI()
        
        # Get all available symbols
        symbols = bitget.get_all_symbols()
        
        # Initialize grid strategy
        strategy = GridStrategy(bitget)
        
        # For demo - process first 3 symbols (adjust as needed)
        results = []
        for symbol in symbols[:3]:
            result = strategy.execute_grid(symbol)
            results.append(result)
        
        return {
            'statusCode': HTTPStatus.OK,
            'body': json.dumps({
                'success': True,
                'results': results
            })
        }
    
    except Exception as e:
        return {
            'statusCode': HTTPStatus.INTERNAL_SERVER_ERROR,
            'body': json.dumps({
                'success': False,
                'error': str(e)
            })
        }￼Enter

from typing import Dict
from .bitget_api import BitgetAPI

class GridStrategy:
    def __init__(self, api: BitgetAPI):
        self.api = api
    
    def calculate_grid_parameters(self, symbol: str) -> Dict:
        """Calculate optimal grid parameters based on market conditions."""
        current_price = self.api.get_current_price(symbol)
        
        # Example strategy - adjust these based on your requirements
        return {
            'lower_price': current_price * 0.9,   # 10% below
            'upper_price': current_price * 1.1,   # 10% above
            'grid_num': 10,                       # Number of grids
            'quantity': 100,                      # USDT amount
            'side': 'open_long'                   # or 'open_short'
        }
    
    def execute_grid(self, symbol: str) -> Dict:
        """Execute grid trading strategy for a symbol."""
        params = self.calculate_grid_parameters(symbol)
        
        response = self.api.request('POST', '/api/mix/v1/order/placePlanOrder', {
            'symbol': symbol,
            'marginCoin': 'USDT',
            'size': str(params['quantity']),
            'rangeType': 'customize',
            'minPrice': str(params['lower_price']),
            'maxPrice': str(params['upper_price']),
            'gridNum': str(params['grid_num']),
            'runType': '1',  # 1: arithmetic, 2: geometric
            'planType': 'normal_plan',
            'triggerPrice': str(params['lower_price']),
            'side': params['side'],
            'orderType': 'market'
        })
        
        return {
            'symbol': symbol,
            'parameters': params,
            'response': response
        }￼Enter

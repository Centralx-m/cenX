import time
from typing import Any, Dict

def rate_limited(max_per_second: int):
    """Decorator to limit how often a function can be called."""
    min_interval = 1.0 / max_per_second
    
    def decorate(func):
        last_time_called = 0.0
        
        def rate_limited_function(*args, **kwargs):
            nonlocal last_time_called
            elapsed = time.time() - last_time_called
            wait = min_interval - elapsed
            
            if wait > 0:
                time.sleep(wait)
            
            last_time_called = time.time()
            return func(*args, **kwargs)
        
        return rate_limited_function
    
    return decorate

def validate_response(response: Dict[str, Any]) -> bool:
    """Validate API response structure."""
    return response.get('code') == '00000' and 'data' in response￼Enter

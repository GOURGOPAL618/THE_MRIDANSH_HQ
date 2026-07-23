import time
from typing import Dict, Any

class ProviderRateLimiter:
    """
    Token bucket rate limiter isolated per external provider.
    """
    def __init__(self, rate_limit_per_minute: int):
        self.capacity = rate_limit_per_minute
        self.tokens = rate_limit_per_minute
        self.fill_rate = rate_limit_per_minute / 60.0  # tokens per second
        self.last_fill = time.time()

    def _fill(self):
        now = time.time()
        elapsed = now - self.last_fill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.fill_rate)
        self.last_fill = now

    def acquire(self) -> bool:
        """
        Attempt to acquire 1 token. Returns True if token acquired, else False.
        """
        self._fill()
        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return True
        return False

    def get_status(self) -> Dict[str, Any]:
        """
        Return the rate limiter state.
        """
        self._fill()
        return {
            "tokens_remaining": int(self.tokens),
            "max_capacity": self.capacity,
            "fill_rate_per_min": self.capacity
        }

# Global instances per provider
limiters = {
    "nasa": ProviderRateLimiter(60),        # 60 calls per minute
    "weather": ProviderRateLimiter(30),     # 30 calls per minute
    "ai": ProviderRateLimiter(20),          # 20 calls per minute
    "github": ProviderRateLimiter(40),      # 40 calls per minute
}

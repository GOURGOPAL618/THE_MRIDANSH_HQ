import time
import json
import logging
from urllib.error import HTTPError
from tests.backend.base import BaseBackendTest
from backend.core.config import settings

class TestRateLimiterAndMiddleware(BaseBackendTest):
    def request(self, path, method="GET", data=None, headers=None, auth=True):
        if headers is None:
            headers = {}
        headers["X-Test-Enable-Limiter"] = "True"
        return super().request(path, method, data, headers, auth)

    def setUp(self):
        super().setUp()
        # Reset rate limiter history in the server process using test header
        self.request(
            "/api/v1/system/health/liveness",
            method="GET",
            headers={"X-Test-Reset-Limiter": "True"},
            auth=False
        )

    def tearDown(self):
        # Clean up rate limits in the server process on teardown too
        self.request(
            "/api/v1/system/health/liveness",
            method="GET",
            headers={"X-Test-Reset-Limiter": "True"},
            auth=False
        )
        super().tearDown()

    def test_login_endpoint_throttled(self):
        # 1. POST /api/v1/auth/login allows exactly 5 requests in a window
        login_data = {"username": "commander", "password": "wrong_password"}
        headers = {"X-Test-Client-IP": "127.0.0.1"}
        for i in range(5):
            with self.assertRaises(HTTPError) as ctx:
                self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers, auth=False)
            self.assertEqual(ctx.exception.status, 401)

        # 6th request must be throttled with HTTP 429
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers, auth=False)
        
        self.assertEqual(ctx.exception.status, 429)

        # Verify JCC response envelope and Retry-After header presence
        body = json.loads(ctx.exception.fp.read().decode())
        self.assertFalse(body["success"])
        self.assertEqual(body["message"], "Too many requests. Operation throttled.")
        self.assertEqual(body["data"]["error_code"], "RATE_LIMIT_EXCEEDED")
        
        headers_resp = ctx.exception.headers
        self.assertIn("Retry-After", headers_resp)
        self.assertTrue(int(headers_resp["Retry-After"]) > 0)

    def test_ai_query_throttled_independently(self):
        # 2. POST /api/v1/ai/query is throttled independently (10 limit)
        headers = {"X-Test-Client-IP": "127.0.0.1"}
        for i in range(10):
            response = self.request("/api/v1/ai/query", method="POST", data={"prompt": "test", "mode": "general"}, headers=headers, auth=True)
            self.assertEqual(response.status, 200)

        # 11th query must be throttled
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/ai/query", method="POST", data={"prompt": "test", "mode": "general"}, headers=headers, auth=True)
        self.assertEqual(ctx.exception.status, 429)

    def test_ai_stream_throttled_independently(self):
        # 3. POST /api/v1/ai/stream is throttled independently (10 limit)
        headers = {"X-Test-Client-IP": "127.0.0.1"}
        for i in range(10):
            response = self.request("/api/v1/ai/stream", method="POST", data={"prompt": "test", "mode": "general"}, headers=headers, auth=True)
            self.assertEqual(response.status, 200)

        # 11th request must be throttled
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/ai/stream", method="POST", data={"prompt": "test", "mode": "general"}, headers=headers, auth=True)
        self.assertEqual(ctx.exception.status, 429)

    def test_liveness_exempt_from_throttling(self):
        # 5. /api/v1/system/health/liveness is exempted from throttling
        # Send 120 requests (above general limit of 100) and verify it is never throttled
        headers = {"X-Test-Client-IP": "127.0.0.1"}
        for i in range(120):
            response = self.request("/api/v1/system/health/liveness", method="GET", headers=headers, auth=False)
            self.assertEqual(response.status, 200)

    def test_general_api_limits(self):
        # 4. General API path (e.g. GET /api/v1/system/dashboard) throttled at 100 requests
        headers = {"X-Test-Client-IP": "127.0.0.1"}
        for i in range(100):
            response = self.request("/api/v1/system/dashboard", method="GET", headers=headers, auth=True)
            self.assertEqual(response.status, 200)

        # 101st request must be throttled
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/system/dashboard", method="GET", headers=headers, auth=True)
        self.assertEqual(ctx.exception.status, 429)

    def test_security_warning_logs_emitted(self):
        # 8. Security warning logs are emitted on rate-limit breach
        login_data = {"username": "commander", "password": "wrong_password"}
        headers = {"X-Test-Client-IP": "127.0.0.1"}
        for i in range(5):
            try:
                self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers, auth=False)
            except HTTPError:
                pass
            
        try:
            self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers, auth=False)
        except HTTPError:
            pass

        # Query database ActivityLog directly using SQLAlchemy in the test process
        from backend.database.session import SessionLocal
        from backend.models.models import ActivityLog
        
        db = SessionLocal()
        try:
            logs = db.query(ActivityLog).filter(
                ActivityLog.module == "security",
                ActivityLog.severity == "warning"
            ).all()
            self.assertTrue(any("[SECURITY_THROTTLE]" in l.description for l in logs))
        finally:
            db.close()

    def test_different_client_identities_isolated(self):
        # 10. Multiple client identities do not share limits incorrectly
        login_data = {"username": "commander", "password": "wrong_password"}
        
        # Send 5 requests from 127.0.0.1
        headers_127 = {"X-Test-Client-IP": "127.0.0.1"}
        for i in range(5):
            try:
                self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers_127, auth=False)
            except HTTPError as e:
                self.assertEqual(e.status, 401)
            
        # 6th request from 127.0.0.1 is throttled
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers_127, auth=False)
        self.assertEqual(ctx.exception.status, 429)

        # Spoofed X-Forwarded-For with NO trusted proxy is treated as 127.0.0.1 (hence throttled too)
        headers_spoof = {
            "X-Test-Client-IP": "127.0.0.1",
            "X-Test-Trusted-Proxies": "none",
            "X-Forwarded-For": "192.168.1.50"
        }
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers_spoof, auth=False)
        self.assertEqual(ctx.exception.status, 429)

        # Request from a clean distinct IP (192.168.1.99) is NOT throttled (returns 401)
        headers_other = {"X-Test-Client-IP": "192.168.1.99"}
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers_other, auth=False)
        self.assertEqual(ctx.exception.status, 401)

    def test_trusted_proxy_spoofing_resolution(self):
        # 11. X-Forwarded-For is used only when source IP is a trusted proxy
        login_data = {"username": "commander", "password": "wrong_password"}
        
        # 127.0.0.1 is configured as trusted proxy, client requests with X-Forwarded-For: 192.168.1.50
        headers = {
            "X-Test-Client-IP": "127.0.0.1",
            "X-Test-Trusted-Proxies": "127.0.0.1",
            "X-Forwarded-For": "192.168.1.50"
        }
        for i in range(5):
            try:
                self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers, auth=False)
            except HTTPError as e:
                self.assertEqual(e.status, 401)

        # 6th request with same headers is throttled (since 192.168.1.50 is throttled)
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers, auth=False)
        self.assertEqual(ctx.exception.status, 429)

        # A request from a different client IP (without X-Forwarded-For or different proxy resolution) is allowed!
        headers_diff = {
            "X-Test-Client-IP": "127.0.0.1",
            "X-Test-Trusted-Proxies": "127.0.0.1",
            "X-Forwarded-For": "192.168.1.51"
        }
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/auth/login", method="POST", data=login_data, headers=headers_diff, auth=False)
        self.assertEqual(ctx.exception.status, 401)

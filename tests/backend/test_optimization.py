import json
from unittest.mock import MagicMock
from tests.backend.base import BaseBackendTest
from backend.database.session import set_sqlite_pragma

# Mock connection classes to simulate sqlite3 vs postgresql connection types
class MockSqliteConnection:
    class __class__:
        __module__ = "sqlite3"
        
    def __init__(self):
        self.cursor_mock = MagicMock()
        
    def cursor(self):
        return self.cursor_mock

class MockPostgresConnection:
    class __class__:
        __module__ = "psycopg2"
        
    def __init__(self):
        self.cursor_mock = MagicMock()
        
    def cursor(self):
        return self.cursor_mock

class TestOptimizationsAndCache(BaseBackendTest):
    def test_sqlite_pragmas_only_on_sqlite(self):
        # 1. Verify SQLite pragmas are applied to sqlite3 connections
        sqlite_conn = MockSqliteConnection()
        set_sqlite_pragma(sqlite_conn, None)
        
        # Verify cursor.execute was called with WAL and synchronous NORMAL
        self.assertTrue(sqlite_conn.cursor_mock.execute.called)
        calls = [c[0][0] for c in sqlite_conn.cursor_mock.execute.call_args_list]
        self.assertIn("PRAGMA journal_mode=WAL", calls)
        self.assertIn("PRAGMA synchronous=NORMAL", calls)
        self.assertTrue(sqlite_conn.cursor_mock.close.called)

        # 2. Verify pragmas are NOT executed on postgres (psycopg2) connections
        pg_conn = MockPostgresConnection()
        set_sqlite_pragma(pg_conn, None)
        self.assertFalse(pg_conn.cursor_mock.execute.called)

    def test_cache_control_public_liveness(self):
        # 3. Public liveness check gets public cache control policy
        response = self.request("/api/v1/system/health/liveness", method="GET", auth=False)
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers.get("Cache-Control"), "public, max-age=60")
        
        # Verify security headers remain present
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")

    def test_cache_control_private_dashboard(self):
        # 4. Authenticated API check gets private, no-store cache policy
        response = self.request("/api/v1/system/dashboard", method="GET", auth=True)
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers.get("Cache-Control"), "private, no-store, no-cache, must-revalidate")
        
        # Verify security headers remain present
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")

    def test_cache_control_sse_streaming(self):
        # 5. SSE streaming responses must not be cached (returns no-store / no-cache)
        response = self.request(
            "/api/v1/ai/stream",
            method="POST",
            data={"prompt": "Verify system state", "mode": "general"},
            auth=True
        )
        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers.get("Cache-Control"), "no-cache, no-store, must-revalidate")
        
        # Verify security headers remain present
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")

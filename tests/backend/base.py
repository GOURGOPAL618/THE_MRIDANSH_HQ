import unittest
import urllib.request
import http.cookiejar
import json

class BaseBackendTest(unittest.TestCase):
    base_url = "http://127.0.0.1:8002"
    opener = None

    @classmethod
    def setUpClass(cls):
        # Setup cookie jar for login sessions
        cls.cj = http.cookiejar.CookieJar()
        cls.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cls.cj))
        
        # Log in to get session cookie
        login_data = json.dumps({"username": "commander", "password": "@mridansh1607x"}).encode("utf-8")
        req = urllib.request.Request(
            f"{cls.base_url}/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/json"}
        )
        try:
            with cls.opener.open(req) as r:
                assert r.status == 200
        except Exception as e:
            # Safe fallback if auth server connection fails
            pass

    def request(self, path, method="GET", data=None, headers=None, auth=True):
        if headers is None:
            headers = {}
        
        encoded_data = None
        if data is not None:
            if isinstance(data, dict):
                encoded_data = json.dumps(data).encode("utf-8")
                headers["Content-Type"] = "application/json"
            else:
                encoded_data = data

        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=encoded_data,
            headers=headers,
            method=method
        )
        
        if auth and self.opener:
            return self.opener.open(req)
        else:
            # Unauthenticated requests use a clean opener without session cookies
            clean_opener = urllib.request.build_opener()
            return clean_opener.open(req)

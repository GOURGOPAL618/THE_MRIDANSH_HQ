import json
from urllib.error import HTTPError
from tests.backend.base import BaseBackendTest

class TestSettingsEndpoints(BaseBackendTest):
    def test_get_settings(self):
        response = self.request("/api/v1/settings", method="GET")
        self.assertEqual(response.status, 200)
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertIn("theme", body["data"])

    def test_update_settings_valid(self):
        update_data = {
            "theme": "deepspace",
            "volume": 0.8,
            "is_muted": False,
            "notifications_enabled": True,
            "performance_mode": "performance",
            "accent_color": "#FF5500",
            "panel_opacity": 0.9,
            "glow_intensity": 1.2,
            "animation_speed": 1.5,
            "border_radius": "8px",
            "font_size": "13px"
        }
        response = self.request("/api/v1/settings", method="PUT", data=update_data)
        self.assertEqual(response.status, 200)
        body = json.loads(response.read().decode())
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["theme"], "deepspace")
        self.assertEqual(body["data"]["panel_opacity"], 0.9)
        self.assertEqual(body["data"]["border_radius"], "8px")

    def test_update_settings_invalid_opacity(self):
        update_data = {
            "panel_opacity": 1.8  # Exceeds maximum 1.0 limit
        }
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/settings", method="PUT", data=update_data)
        self.assertEqual(ctx.exception.status, 422)

    def test_update_settings_invalid_color(self):
        update_data = {
            "accent_color": "not_a_hex_color"
        }
        with self.assertRaises(HTTPError) as ctx:
            self.request("/api/v1/settings", method="PUT", data=update_data)
        self.assertEqual(ctx.exception.status, 422)

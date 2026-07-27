import test from "node:test";
import assert from "node:assert";
import { themes, defaultTheme } from "../../../frontend/config/theme.ts";
import { isValidHexColor } from "../../../frontend/utils/helpers.ts";

test("Theme Engine Token Registry Config Contracts", () => {
  const expectedThemes = ["default", "arctic", "midnight", "deepspace", "solar", "engineering", "minimal"];
  
  // 1. Verify all 7 themes are defined
  for (const themeId of expectedThemes) {
    assert.ok(themes[themeId], `Theme ${themeId} must be present in themes config registry.`);
    
    const theme = themes[themeId];
    // 2. Validate mandatory token properties
    assert.strictEqual(theme.id, themeId);
    assert.ok(theme.name, `Theme ${themeId} must have a user-facing name.`);
    assert.ok(isValidHexColor(theme.background), `Background ${theme.background} must be a valid hex color.`);
    assert.ok(isValidHexColor(theme.panel), `Panel ${theme.panel} must be a valid hex color.`);
    assert.ok(isValidHexColor(theme.primary), `Primary ${theme.primary} must be a valid hex color.`);
    
    // 3. Validate bounded defaults ranges
    assert.ok(theme.panelOpacity >= 0.0 && theme.panelOpacity <= 1.0, "Panel opacity must be bounded [0, 1].");
    assert.ok(theme.glowIntensity >= 0.0 && theme.glowIntensity <= 3.0, "Glow intensity must be bounded [0, 3].");
    assert.ok(theme.animationSpeed >= 0.0 && theme.animationSpeed <= 3.0, "Animation speed must be bounded [0, 3].");
  }

  // 4. Default fallback checks
  assert.strictEqual(defaultTheme.id, "default");
});

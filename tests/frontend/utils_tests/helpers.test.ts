import test from "node:test";
import assert from "node:assert";
import {
  truncateString,
  slugify,
  capitalize,
  chunk,
  unique,
  sortBy,
  omit,
  pick,
  deepMerge,
  isValidEmail,
  isValidCoordinates,
  isValidHexColor
} from "../../../frontend/utils/helpers.ts";

test("String Utility Helpers", () => {
  assert.strictEqual(truncateString("THE MRIDANSH JCC COCKPIT", 12), "THE MRIDANSH...");
  assert.strictEqual(truncateString("Short", 10), "Short");
  assert.strictEqual(slugify("Core Plume Temp!"), "core-plume-temp");
  assert.strictEqual(capitalize("radar"), "Radar");
});

test("Array Utility Helpers", () => {
  assert.deepStrictEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepStrictEqual(unique([1, 2, 2, 3, 1, 4]), [1, 2, 3, 4]);
  
  const items = [{ id: 2 }, { id: 1 }, { id: 3 }];
  assert.deepStrictEqual(sortBy(items, "id", "asc"), [{ id: 1 }, { id: 2 }, { id: 3 }]);
});

test("Object Utility Helpers", () => {
  const obj = { a: 1, b: 2, c: 3 };
  assert.deepStrictEqual(omit(obj, ["b", "c"]), { a: 1 });
  assert.deepStrictEqual(pick(obj, ["a", "c"]), { a: 1, c: 3 });
  
  const target = { x: 1, y: { z: 2 } };
  const source = { y: { w: 3 } };
  assert.deepStrictEqual(deepMerge(target, source), { x: 1, y: { z: 2, w: 3 } });
});

test("Boundary Validators", () => {
  assert.strictEqual(isValidEmail("commander@mridansh.org"), true);
  assert.strictEqual(isValidEmail("commander@mridansh"), false);
  assert.strictEqual(isValidCoordinates(21.03, 80.24), true);
  assert.strictEqual(isValidCoordinates(100.5, 200.0), false);
  assert.strictEqual(isValidHexColor("#00FFFF"), true);
  assert.strictEqual(isValidHexColor("invalid_color"), false);
});

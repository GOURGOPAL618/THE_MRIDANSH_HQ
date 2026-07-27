const { spawn } = require("child_process");
const path = require("path");

function runFrontendTests() {
  console.log("=== Launching Frontend Native Automated Testing Suite ===");
  
  const rootDir = path.resolve(__dirname, "..");
  const testFiles = [
    path.join(__dirname, "frontend", "utils_tests", "helpers.test.ts"),
    path.join(__dirname, "frontend", "component_tests", "components.test.ts")
  ];
  
  // Execute node --experimental-strip-types --test
  const child = spawn(
    "node",
    ["--experimental-strip-types", "--test", ...testFiles],
    { stdio: "inherit", cwd: rootDir }
  );
  
  child.on("close", (code) => {
    if (code === 0) {
      console.log("=== FRONTEND TESTING SUITE PASSED SUCCESSFULLY ===");
      process.exit(0);
    } else {
      console.error("=== FRONTEND TESTING SUITE FAILED ===");
      process.exit(code || 1);
    }
  });
}

runFrontendTests();

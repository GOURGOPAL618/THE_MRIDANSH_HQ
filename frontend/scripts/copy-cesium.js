const fs = require("fs");
const path = require("path");

function copyFolderSync(from, to) {
  try {
    if (!fs.existsSync(from)) {
      console.warn(`Source folder does not exist: ${from}`);
      return;
    }
    if (!fs.existsSync(to)) {
      fs.mkdirSync(to, { recursive: true });
    }
    fs.cpSync(from, to, { recursive: true, force: true });
    console.log(`Copied from ${from} to ${to}`);
  } catch (err) {
    console.error(`Error copying ${from} to ${to}:`, err);
  }
}

const source = path.join(__dirname, "..", "node_modules", "cesium", "Build", "Cesium");
const destination = path.join(__dirname, "..", "public", "cesium");

console.log("Preparing Cesium static assets...");
copyFolderSync(path.join(source, "Assets"), path.join(destination, "Assets"));
copyFolderSync(path.join(source, "Widgets"), path.join(destination, "Widgets"));
copyFolderSync(path.join(source, "Workers"), path.join(destination, "Workers"));
copyFolderSync(path.join(source, "ThirdParty"), path.join(destination, "ThirdParty"));
console.log("Cesium static assets copy complete.");


import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Check what build files exist and log them
console.log("Checking build directory structure...");
const buildDir = path.join(__dirname, "build");

if (fs.existsSync(buildDir)) {
  console.log("Build directory contents:");
  try {
    const files = fs.readdirSync(buildDir, { recursive: true });
    files.forEach(file => console.log(`  ${file}`));
  } catch (err) {
    console.log("Error reading build directory:", err.message);
  }
} else {
  console.log("Build directory does not exist!");
}

// Serve static files from the build/client directory if it exists
const clientDir = path.join(__dirname, "build", "client");
if (fs.existsSync(clientDir)) {
  console.log("Serving static files from build/client");
  app.use(express.static(clientDir, { immutable: true, maxAge: "1y" }));
} else {
  console.log("build/client directory not found");
}

// Try to find the server build file
const possibleServerPaths = [
  "./build/index.js",
  "./build/server/index.js",
  "./build/server.js",
  "./build/remix.js"
];

let build = null;
let serverPath = null;

for (const buildPath of possibleServerPaths) {
  try {
    if (fs.existsSync(path.join(__dirname, buildPath.replace('./', '')))) {
      console.log(`Found server build at: ${buildPath}`);
      build = await import(buildPath);
      serverPath = buildPath;
      break;
    }
  } catch (err) {
    console.log(`Failed to import ${buildPath}:`, err.message);
  }
}

if (build && typeof build.default?.fetch === 'function') {
  // This is a CloudFlare Pages/Workers style build
  console.log("Using CloudFlare Pages/Workers style handler");
  app.all("*", async (req, res) => {
    const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    try {
      const response = await build.default.fetch(request);
      const body = await response.text();
      res.status(response.status).send(body);
    } catch (err) {
      console.error('Request handler error:', err);
      res.status(500).send('Internal Server Error');
    }
  });
} else if (build) {
  // Try to use as a regular Remix build
  console.log("Using standard Remix handler");
  try {
    const { createRequestHandler } = await import("@remix-run/node");
    app.all("*", createRequestHandler({
      build: build
    }));
  } catch (err) {
    console.error("Error setting up Remix handler:", err);
    res.status(500).send('Build file found but could not set up request handler');
  }
} else {
  console.log("No server build found, serving static files only");
  app.get("*", (req, res) => {
    res.status(404).send("Application build not found. Check build output structure.");
  });
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Server build path: ${serverPath || 'None found'}`);
});

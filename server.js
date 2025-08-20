import { createRequestHandler } from "@remix-run/node";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files from the build/client directory
app.use(express.static("build/client", { immutable: true, maxAge: "1y" }));

// Handle all other requests with Remix
const build = await import("./build/index.js");
app.all("*", createRequestHandler({
  build: build
}));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

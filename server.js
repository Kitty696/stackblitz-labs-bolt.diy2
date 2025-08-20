const { createRequestHandler } = require("@remix-run/node");
const express = require("express");

const app = express();

app.use(express.static("build/client"));

app.all("*", createRequestHandler({
  build: require("./build/index.js")
}));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

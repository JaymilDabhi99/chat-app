require("dotenv").config();

const express = require("express");
const { createServer } = require("http");
const { join } = require("path");
const connectDB = require("./utils/db");
const router = require("./routes/route");
const initializeSocket = require("./socket");

const app = express();
const server = createServer(app);

const database = connectDB();

app.use(express.static(join(__dirname, "/public")));

app.use(router);

initializeSocket(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

const express = require("express");
const {
  homeController,
  chatController,
} = require("../controllers/chatController");

const router = express.Router();

router.get("/", homeController);
router.get("/chat", chatController);

module.exports = router;

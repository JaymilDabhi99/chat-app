const express = require("express");
const {
  chatController
} = require("../controllers/chatController");
const { homeController } = require("../controllers/homeController"); 

const router = express.Router();

router.get("/", homeController);
router.get("/chat", chatController);

module.exports = router;

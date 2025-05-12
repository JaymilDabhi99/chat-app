const { join } = require("path");

const connectDB = require("../utils/db");

const homeController = (req, res) => {
    res.sendFile(join(__dirname, "../public/homepage.html"));
      
};


module.exports = {
    homeController,
}
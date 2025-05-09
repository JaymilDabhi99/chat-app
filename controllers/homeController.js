const { join } = require("path");

const connectDB = require("../utils/db");

const homeController = (req, res) => {
    res.sendFile(join(__dirname, "../public/homepage.html"));
      
    try {
        
    } catch (error) {
        console.log("Error: ", error.message);
    }
};


module.exports = {
    homeController,
}
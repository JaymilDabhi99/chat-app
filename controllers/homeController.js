const { join } = require("path");

const homeController = (req, res) => {
    res.sendFile(join(__dirname, "../public/homepage.html"));

    try {
        const { username } = req.body;
        if(!username){
            return res.status(400).json({ message: "Username is required" });
        }
    } catch (error) {
        console.log("Error: ",error);
    }
};


module.exports = {
    homeController,
}
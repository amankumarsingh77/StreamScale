const express = require("express");
const { updateFileStatusController } = require("../controllers/user.js/file");

const router = express.Router();

router.post("/updatestatus", updateFileStatusController);

module.exports = router;

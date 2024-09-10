const express = require("express");
const { updateFileStatus } = require("../controllers/fileController");

const router = express.Router();

router.post("/updatestatus", updateFileStatus);

module.exports = router;

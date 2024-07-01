const express = require("express");
const { updateFileStatusByPath } = require("../services/file");
const router = express.Router();

router.post("/updatestatus", async (req, res) => {
  const { key, status } = req.body;
  if (!key || !status) {
    return res.status(400).json({
      message: "key and status are required",
      status: 400,
    });
  }
  await updateFileStatusByPath(key, status);
  res.status(200).json({
    message: "status updated",
    status: 200,
  });
});

module.exports = router;

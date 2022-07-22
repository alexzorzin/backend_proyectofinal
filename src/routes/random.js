const express = require("express");
const { Router } = express;
const router = new Router();
const { fork } = require("child_process");

router.get("/", (req, res) => {
  res.send(
      `Server abierto en el puerto ${args.puerto} - <b>PID ${
          process.pid
      }</b> - ${new Date().toLocaleString()}`
  );
});

module.exports = router;

const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('index', { title: 'Criipto Node.js Demo' });
});

module.exports = router;

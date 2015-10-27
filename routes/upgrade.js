/**
 * Created by liuxinyi on 2015/8/25.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var express = require('express');
var router = express.Router();

router.get('/status', function (req, res) {
    var us = req.app.get('fs.update.service');
    res.end(JSON.stringify({isUpdating: us.status()}));
});

module.exports = router;
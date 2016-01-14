/**
 * Created by rain on 2015/8/7.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var express = require('express');
var router = express.Router();
var Project = require('../freesun/models/project');
var Auth = require('./auth');

router.post('/toggle', function (req, res) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            var pjid = req.body.pjid;
            var pid = req.body.id;
            var cmd = Number(req.body.cmd);
            var us = req.app.get('fs.update.service');
            if (us.isRunning) {
                res.end({res: false, msg: 'A deploy or update job is running.'});
            }

            var pr = Project.findProcessById(pjid, pid);
            if (pr == null) {
                res.end('process not found');
            }
            pr.toggle(cmd, true).then(function (r) {
                res.end(JSON.stringify({res: true, msg: r}));
            }, function (r) {
                res.end(JSON.stringify({res: false, msg: r}));
            });
        });
});

module.exports = router;
/**
 * Created by liuxinyi on 2015/9/1.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var express = require('express');
var router = express.Router();
var Q = require('q');
var iis = require('../freesun/tools/iis');
var Project = require('../freesun/models/project');
var Auth = require('./auth');

router.post('/toggle', function (req, res) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            var pjid = req.body.pjid;
            var id = req.body.id;
            var cmd = Number(req.body.cmd);

            var site = Project.findWebServerById(pjid, id);
            if (site == null) {
                res.end(JSON.stringify({res: true, msg: 'web server not found'}));
                return;
            }
            site.toggle(cmd, false)
                .then(function (r) {
                    res.end(JSON.stringify({res: true, msg: site.name + (cmd === 1 ? ' started.' : ' stopped')}));
                }, function (err) {
                    res.end(JSON.stringify({res: false, msg: err}));
                });
        });
});

module.exports = router;
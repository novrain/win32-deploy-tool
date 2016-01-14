/**
 * Created by rain on 2015/9/7.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var express = require('express');
var router = express.Router();
var Project = require('../freesun/models/project');
var config = require('../freesun/env/config');
var Auth = require('./auth');

function checkStatus(req, res) {
    var us = req.app.get('fs.update.service');
    if (us.isRunning) {
        res.end({result: false, msg: 'A deploy or update job is running.'});
    }
}


router.get('/list', function (req, res, next) {
    res.send(Project.all());
});

router.delete('/delete/:id', function (req, res, next) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            checkStatus(req, res);
            var us = req.app.get('fs.update.service');
            us.deleteById(req.params.id).then(function () {
                res.end(JSON.stringify({result: true}));
            }, function () {
                res.end(JSON.stringify({result: false}));
            });
        });
});

router.post('/watch/switch', function (req, res, next) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            checkStatus(req, res);

            if (config.project.watch) {
                Project.watchSwitch();
                res.end(JSON.stringify({result: true}));
            } else {
                res.end(JSON.stringify({result: false}));
            }
        });
});

router.get('/watch/state', function (req, res, next) {
    res.end(JSON.stringify({result: Project.isWatching()}));
});

router.post('/startall', function (req, res, next) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            checkStatus(req, res);

            Project.startAll().then(function (rs) {
                res.end(JSON.stringify({result: true, msg: rs}));
            }, function (err) {
                res.end(JSON.stringify({result: false, msg: err}));
            });
        });
});

router.post('/start/:id', function (req, res, next) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            checkStatus(req, res);

            Project.start(req.params.id).then(function (rs) {
                res.end(JSON.stringify({result: true, msg: rs}));
            }, function (err) {
                res.end(JSON.stringify({result: false, msg: err}));
            });
        });
});

router.post('/stopall', function (req, res, next) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            checkStatus(req, res);

            Project.stopAll().then(function (rs) {
                res.end(JSON.stringify({result: true, msg: rs}));
            }, function (err) {
                res.end(JSON.stringify({result: false, msg: err}));
            });
        });
});

router.post('/stop/:id', function (req, res, next) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            checkStatus(req, res);

            Project.stop(req.params.id).then(function (rs) {
                res.end(JSON.stringify({result: true, msg: rs}));
            }, function (err) {
                res.end(JSON.stringify({result: false, msg: err}));
            });
        });
});

module.exports = router;
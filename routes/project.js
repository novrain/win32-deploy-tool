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

router.get('/list', function (req, res, next) {
    res.send(Project.all());
});

router.delete('/delete/:id', function (req, res, next) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            res.end(JSON.stringify({result: Project.deleteById(req.params.id)}));
        });
});

router.post('/watch/switch', function (req, res, next) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            if (config.project.watch) {
                Project.watchSwitch();
                res.end(JSON.stringify({result: true}));
            } else {
                res.end(JSON.stringify({result: false}));
            }
        });
});

router.get('/watch/state', function (req, res, next) {
    res.end(JSON.stringify({result: Project.watch()}));
});

module.exports = router;
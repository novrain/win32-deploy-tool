/**
 * Created by liuxinyi on 2015/8/24.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var express = require('express');
var fs = require('fs');
var formidable = require('formidable');
var router = express.Router();
var Auth = require('./auth');

router.post('/package', function (req, res) {
    Auth.isAuthenticated(req, res)
        .then(function () {
            var form = new formidable.IncomingForm;
            form.uploadDir = './uploads';
            form.keepExtensions = true;
            form.parse(req, function (err, fields, files) {
                if (err != null) {
                    res.end(JSON.stringify({res: false, msg: err}));
                    return;
                }

                var pkg = files[0];
                if (pkg.type !== 'application/x-zip-compressed') {
                    res.end(JSON.stringify({res: false, msg: '只支持zip格式文件'}));
                } else {
                    var fileName = pkg.path + '.zip';
                    try {
                        fs.renameSync(pkg.path, fileName);
                        var us = req.app.get('fs.update.service');
                        var pjid = req.query.pjid;
                        if (pjid === '-1') {// install
                            us.install(fs.realpathSync(fileName));
                        } else if (pjid === '-2') {
                            us.selfUpdate(fs.realpathSync(fileName));
                        } else {
                            us.update(pjid, fs.realpathSync(fileName));
                        }
                        res.end(JSON.stringify({res: true, msg: fileName}));
                    } catch (e) {
                        res.end(JSON.stringify({res: false, msg: e.message}));
                    }
                }
            });
        });
});

module.exports = router;
/**
 * Created by rain on 2015/8/27.
 */

var us = require('../freesun/services/updateservice');
var fs = require('graceful-fs');
fs.lstat('D:\\svn\\FS-axNurse-svn\\trunk\\code\\runtime\\app/Server/NGETService', function (err, stats) {
    console.log(err);
});

us.run(0, 'D:\\svn\\FS-axNurse-svn\\trunk\\code\\uploads\\upload_b5bc7a664fb4818990709d8cc007dd96.zip');
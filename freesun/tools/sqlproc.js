/*jslint node:true */
'use strict';
var process = require('child_process'),
    path = require('path'),
    Q = require('q'),
    logger = require('../env/logger');

module.exports = function (command, onData) {
    var sqlcmd = process.spawn(command.path, command.args),
        log = function (message) {
            message = message.toString('utf8');
            logger.log(message);
            return message;
        },
        stdout = '',
        stderr = '',
        deferred = Q.defer();
    sqlcmd.stdout.on('data', function (message) {
        var msg = log(message);
        stdout += msg;
        if (onData) {
            onData(msg);
        }
    });
    sqlcmd.stderr.on('data', function (message) {
        stderr += log(message);
    });
    sqlcmd.on('exit', function (code) {
        logger.log('Exit code: ' + code);
        if (code > 0) {
            var message = 'sqlcmd failed' + (stderr ? ': \r\n\r\n' + stderr : '.');
            deferred.reject(new Error(message));
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise;
};
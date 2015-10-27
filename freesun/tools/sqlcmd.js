/*
 * -- copy sqlcmd-runner from https://github.com/mikeobrien/node-sqlcmd-runner
 */

/*jslint node:true */
'use strict';

var run = require('./sqlproc'),
    command = require('./command');

module.exports = function (options, onData) {
    return run(command(options), onData);
};
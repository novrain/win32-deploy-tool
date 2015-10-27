/**
 * Created by rain on 2015/8/23. -- copy form ms-wmic  https://github.com/mjhasbach/node-ms-wmic
 */
/*jslint node:true */
/*jslint nomen:true */
/*jslint stupid:true */
'use strict';
var csv = require('csv'),
    _ = require('lodash'),
    exec = require('child_process').exec;
var parseOuput = function (err, stdOut, cb) {
    if (err) {
        cb(err, [], stdOut);
        return;
    }
    csv.parse(stdOut.replace(/\r\r/g, '\n'), {columns: true, relax: true}, function (err, rows) {
        cb(err, rows, stdOut);
    });
};
var wmic = {
    execute: function (args, cb) {
        if (!_.isFunction(cb)) {
            cb = _.noop;
        }
        if (!_.isString(args)) {
            cb(new TypeError('args must be a string'));
            return wmic;
        }

        exec('wmic ' + args, function (errIn, stdOut, stdErr) {
            var err = errIn || stdErr.trim();

            cb(err ? new Error(err + args) : null, stdOut.trim());
        });

        return wmic;
    },

    path: {
        get: function (obj, where, cb) {
            if (_.isFunction(where)) {
                cb = where;
            }
            if (!_.isFunction(cb)) {
                throw new TypeError('cb must be a function');
            }

            wmic.execute('path ' + obj + ' ' + where + 'get * /format:csv', function (err, stdOut) {
                parseOuput(err, stdOut, cb);
            });

            return wmic;
        }
    },
    process: {
        list: function (where, cb) {
            if (_.isFunction(where)) {
                cb = where;
            }
            if (!_.isFunction(cb)) {
                throw new TypeError('cb must be a function');
            }

            wmic.execute('process' + where + 'list /format:csv', function (err, stdOut) {
                parseOuput(err, stdOut, cb);
            });

            return wmic;
        }
    }
};
module.exports = wmic;
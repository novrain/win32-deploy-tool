/**
 * Created by rain on 2015/8/15.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var winston = require('winston');
var path = require('path');

var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: 'all'
        }),
        new (winston.transports.File)({
            filename: path.join(__dirname, '../axNurse.log')
        })
    ],
    exitOnError: false
});

module.exports = logger;
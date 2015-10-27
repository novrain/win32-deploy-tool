/**
 * Created by rain on 2015/8/5.
 */
/*jslint node:true */
'use strict';

var config = {
    auth: {
        enable: true
    },
    ws: {
        process: 8100,
        processInterval: 1000,
        system: 8300,
        systemInterval: 1000,
        tail: 8200,
        update: 8400,
        backupClearInterval: 1000 * 60 * 60 * 24
    },
    debug: true,
    project: {
        watch: false
    }
};

module.exports = config;

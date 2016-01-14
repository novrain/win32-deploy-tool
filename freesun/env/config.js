/**
 * Created by rain on 2015/8/5.
 */
/*jslint node:true */
'use strict';

var path = require('path');

var config = {
    auth: {
        enable: true
    },
    ws: {
        process: 8100,
        processInterval: 1000,
        refreshHistoryInterval: 1000 * 60 * 5, // per five min
        system: 8300,
        systemInterval: 1000,
        tail: 8200,
        update: 8400,
        backupClearInterval: 1000 * 60 * 60 * 24
    },
    debug: true,
    project: {
        watch: true
    },
    database: {
        url: "sqlite://sqlite:sqlite@localhost:5432/sqlite",
        opts: {
            storage: path.join(__dirname, 'axnurse.db')
        }
    }
};

module.exports = config;

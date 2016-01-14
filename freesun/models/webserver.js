/**
 * Created by rain on 2015/8/26.
 */

/*jslint node:true */
/*jslint nomen:true */
'use strict';
var fs = require('fs');
var os = require('os');
var Q = require('q');
var exec = require('child_process').exec;

var logger = require('../env/logger');
var iis = require('../tools/iis');

function WebServer(web) {
    this.id = web.id;
    this.name = web.name;
    this.protocol = web.protocol;
    this.port = web.port;
    this.host = web.host;
    this.path = web.path;
    this.isWatching = web.watch !== undefined ? web.watch : true;
    this.absPath = web.absPath;
    this.absDir = web.absDir;
    this.pool = web.pool;
    this.refresh();
}

WebServer.prototype.refresh = function () {
    var self = this,
        derfered = Q.defer();
    ((Q.nbind(iis.getInfo, iis))('site', self.name))
        .then(function (info) {
            var status = info === null ? 'Stopped' : info.state;
            ((Q.nbind(iis.getInfo, iis))('apppool', self.pool)).then(function (pool) {
                self.status = pool === null ? null : ((status === 'Started' && pool.state === 'Started') ? 'Started' : 'Stopped');
                derfered.resolve();
            }, function () {
                derfered.resolve();
            });
        }, function (err) {
            logger.error(err);
            self.status = null;
            derfered.resolve();
        });
    return derfered.promise;
};

WebServer.prototype.isRunning = function () {
    return this.status === 'Started';
};

WebServer.prototype.toggle = function (cmd, refresh) {
    var self = this,
        derfered = Q.defer(),
        start,
        func;
    if (refresh) {
        start = self.refresh;
    } else {
        start = Q();
    }
    if (cmd === 1) {
        func = iis.startSite;
    } else {
        func = iis.stopSite;
    }
    start.then(function () {
        ((Q.nbind(func, iis))(self))
            .then(function () {
                derfered.resolve();
            }, function (err) {
                derfered.reject(err);
            });
    });
    return derfered.promise;
};

module.exports = WebServer;
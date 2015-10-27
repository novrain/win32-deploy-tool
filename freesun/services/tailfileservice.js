/**
 * Created by rain on 2015/8/14.
 */
/*jslint node:true */
'use strict';
var WebSocketServer = require('ws').Server;
var WebSocket = require('ws');
var Q = require('q');
var fs = require('fs');

var Process = require('../models/process');
var logger = require('../env/logger');
var Tail = require('../tools/tail').Tail;
var wsconfig = require('../env/config').ws;

function TailRecord(tail) {
    this.tail = tail;
    this.count = 0;
}

function Ts(wss) {
    this.wss = wss;
    this.tailedfiles = {};
}

Ts.prototype.stop = function () {
    var tailedfile, tailRecord;
    try {
        for (tailedfile in this.tailedfiles) {
            if (this.tailedfiles.hasOwnProperty(tailedfile)) {
                tailRecord = this.tailedfiles[tailedfile];
                if (tailRecord && tailRecord.tail) {
                    tailRecord.tail.unwatch();
                }
            }
        }
        this.wss.close();
    } catch (e) {
        logger.error('Fail to stop tail server, reason: %s.', e.stack);
    }
};

Ts.prototype.onErr = function (error) {
    logger.error('Tail error %s', error);
};

Ts.prototype.onSuccess = function (msg) {
    logger.info(msg);
};

Ts.prototype.onReq = function (req) {
    var deferred = Q.defer();
    try {
        req = JSON.parse(req);
        if (req.filetotail) {
            deferred.resolve(req.filetotail);
        } else {
            deferred.reject({e: 'Invalid request.'});
        }
    } catch (e) {
        deferred.reject(e.message);
    }
    return deferred.promise;
};

Ts.prototype.checkFile = function (fileToTail) {
    var deferred = Q.defer();
    fs.stat(fileToTail, function (err, stats) {
        if (err) {
            deferred.reject(err);
        } else {
            stats.fileToTail = fileToTail;
            deferred.resolve(stats);
        }
    });
    return deferred.promise;
};

Ts.prototype.start = function () {
    var ts = this;
    this.wss.on('connection', function connection(ws) {
        ws.on('message', function incoming(req) {
            ts.onReq(req)
                .then(ts.checkFile)
                .then(function (fileStats) {
                    var emsg = '', tailRecord, tail,
                        deferred = Q.defer();

                    if (fileStats.isFile()) {
                        if (!ts.tailedfiles.hasOwnProperty(fileStats.fileToTail)) {
                            ts.tailedfiles[fileStats.fileToTail] = new TailRecord(new Tail(fileStats.fileToTail, '\r\n', 'ascii'), 0);
                        }
                        tailRecord = ts.tailedfiles[fileStats.fileToTail];
                        tail = tailRecord.tail;
                        if (!ws.tailedfile) {
                            tail.on('line', function tailSend(data) {
                                try {
                                    ws.send(data);
                                } catch (e) {
                                    tail.removeListener('line', tailSend);
                                }
                            });
                            //trick
                            ws.tailedfile = fileStats.fileToTail;
                            tailRecord.count = tailRecord.count + 1;
                            tail.watch();
                            deferred.resolve('Success to tail file: ' + fileStats.fileToTail);
                        } else {
                            emsg = 'Duplicated file tail request.';
                            deferred.reject(emsg);
                        }
                    } else {
                        emsg = fileStats.fileToTail + ' does not exist';
                        deferred.reject(emsg);
                    }
                    return deferred.promise;
                })
                .then(ts.onSuccess)
                .catch(ts.onErr)
                .done();
        });
        ws.on('close', function close() {
            if (this.tailedfile) {
                var trToClean = ts.tailedfiles[this.tailedfile];
                if (trToClean) {
                    trToClean.count = trToClean.count - 1;
                    if (trToClean.count <= 0) {
                        trToClean.tail.unwatch();
                    }
                }
            }
        });
    });
};

module.exports = new Ts(new WebSocketServer({port: wsconfig.tail}));
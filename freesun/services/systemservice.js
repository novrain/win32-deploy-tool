/**
 * Created by rain on 2015/8/10.
 */
/*jslint node:true */
'use strict';
var WebSocketServer = require('ws').Server;
var os = require('os');

var logger = require('../env/logger');
var wsconfig = require('../env/config').ws;

function OsSys(wss) {
    this.wss = wss;
    this.start = function () {
        this.wss.broadcast = function (data) {
            wss.clients.forEach(function each(client) {
                try {
                    client.send(data);
                } catch (e) {
                    logger.error('Fail to send message to client[%s], reason: %s.', client, e.stack);
                }
            });
        };
        var that = this,
            service = function (interval) {
                interval = interval || 5000;
                setTimeout(function () {
                    if (that.wss.clients.length > 0) {
                        var cpus = os.cpus(), results = {},
                            memresult, cpuresults,
                            i, cpu, total, type, len;
                        results.cpus = [];
                        results.mems = {};
                        results.uptime = Number(os.uptime() / 60 / 60).toFixed(2);
                        memresult = results.mems;
                        memresult.totalmem = os.totalmem();
                        memresult.freemem = os.freemem();
                        memresult.memused = os.totalmem() - os.freemem();
                        memresult.memusage = Math.round(100 * (os.totalmem() - os.freemem()) / os.totalmem());
                        cpuresults = results.cpus;

                        for (i = 0, len = cpus.length; i < len; i = i + 1) {
                            //logger.info('CPU %s', i);
                            cpu = cpus[i];
                            total = 0;
                            cpuresults[i] = {};
                            cpuresults[i].no = i;
                            for (type in cpu.times) {
                                if (cpu.times.hasOwnProperty(type)) {
                                    total += cpu.times[type];
                                }
                            }

                            for (type in cpu.times) {
                                if (cpu.times.hasOwnProperty(type)) {
                                    cpuresults[i][type] = Math.round(100 * cpu.times[type] / total);
                                }
                            }
                        }
                        wss.broadcast(JSON.stringify(results), function () { //ignore errors
                        });
                        service(interval);
                    } else {
                        service(interval);
                    }
                }, interval);
            };
        service(wsconfig.systemInterval);
    };

    this.stop = function () {
        try {
            this.wss.close();
        } catch (e) {
            logger.error('Fail to close OsSys server, reason: %s.', e.stack);
        }
    };
}

module.exports = new OsSys(new WebSocketServer({port: wsconfig.system}));
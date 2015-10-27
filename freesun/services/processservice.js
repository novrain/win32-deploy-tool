/**
 * Created by rain on 2015/8/7.
 */
/*jslint node:true */
'use strict';
var WebSocketServer = require('ws').Server;

var Project = require('../models/project');
var logger = require('../env/logger');
var wsconfig = require('../env/config').ws;

function Ps(wss) {
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
                    //if (that.wss.clients.length > 0) {
                    Project.allWithRuntimeInfo().then(function (all) {
                        wss.broadcast(JSON.stringify(all.filter(function (p, i, arr) {
                            return p != null;
                        })));
                        service(interval);
                    }, function (err) {
                        logger.error(err);
                        service(interval);
                    });
                    //} else {
                    //    service(interval);
                    //}
                }, interval);
            };
        service(wsconfig.processInterval);
    };

    this.stop = function () {
        try {
            this.wss.close();
        } catch (e) {
            logger.error('Fail to stop Ps server, reason: %s.', e.stack);
        }
    };
}

module.exports = new Ps(new WebSocketServer({port: wsconfig.process}));
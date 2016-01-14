/**
 * Created by rain on 2015/8/26.
 */
/*jslint node:true */
"use strict";

var Q = require('q');
var path = require('path');
var ustring = require('underscore.string');
var uuid = require('node-uuid');

var iis = require('../tools/iis');
var FlowStep = require('./flowStep').FlowStep;
var StepLog = require('./flowStep').StepLog;
var StepStatus = require('./flowStep').StepStatus;
var Project = require('../models/project');


function WebUpdate() {
}

var templateFunc = function (iisOp, flow, desc) {
    var deferred = Q.defer(),
        flowStep,
        stepLog,
        proj = flow.project;
    if (typeof iisOp !== 'function') {
        deferred.reject(ustring.sprintf('Operator %s is not a function', iisOp.toString()));
    }
    flowStep = new FlowStep(ustring.sprintf('%s.', desc));
    flow.service.newStep(flowStep);
    flow.service.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    proj.webserver.reduce(function (prev, next, i) {
        return prev.then(function () {
            if (desc === 'Start web server') {//trick
                if (!Project.lastState || !next.project.isWatching || !next.isWatching) {
                    stepLog = new StepLog(ustring.sprintf('One of global/project/web server watching switch is off, skip: %s', next.name), 2, 'warn');
                    flow.service.updateStep(flowStep, stepLog);
                    return Q();
                }
            }
            stepLog = new StepLog(ustring.sprintf('%s: %s', desc, JSON.stringify(next)), 2, 'info');
            flow.service.updateStep(flowStep, stepLog);
            var func = Q.nbind(iisOp, iis);
            return func(next);
        });
    }, Q()).then(function () {
        flow.service.updateStep(flowStep, new StepLog('End...', 1, 'info'));
        flowStep.status = StepStatus.Success;
        deferred.resolve(flow);
    }).catch(function (err) {
        stepLog = new StepLog(ustring.sprintf('Fail, reason: %s', err), 1, 'error');
        flowStep.status = StepStatus.Failed;
        flow.service.updateStep(flowStep, stepLog);
        flow.error = err;
        deferred.reject(flow);
    });
    return deferred.promise;
};

var stop = function (flow) {
    return templateFunc(iis.stopSite, flow, 'Stop web server');
};
WebUpdate.stop = stop;

var deletee = function (flow) {
    return templateFunc(iis.deleteSite, flow, 'Delete web server');
};
WebUpdate.deletee = deletee;

var create = function (flow) {
    return templateFunc(iis.createSite, flow, 'Create web server');
};
WebUpdate.create = create;

var start = function (flow) {
    return templateFunc(iis.startSite, flow, 'Start web server');
};
WebUpdate.start = start;

var deleteePool = function (flow) {
    return templateFunc(iis.deleteAppPool, flow, 'Delete app pool');
};
WebUpdate.deleteePool = deleteePool;

var stopAppPool = function (flow) {
    return templateFunc(iis.stopAppPool, flow, 'Stop app pool');
};
WebUpdate.stopAppPool = stopAppPool;

var createPool = function (flow) {
    return templateFunc(iis.createAppPool, flow, 'Create app pool');
};
WebUpdate.createPool = createPool;

var mapAppPool = function (flow) {
    return templateFunc(iis.mapAppPool, flow, 'Map app pool');
};
WebUpdate.mapAppPool = mapAppPool;

module.exports = WebUpdate;
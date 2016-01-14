/**
 * Created by liuxinyi on 2015/8/25.
 */
/*jslint node:true */
"use strict";
var fs = require('fs-extra');
var Q = require('q');
var ustring = require('underscore.string');
var Project = require('../models/project');

var Process = require('../models/process');
var FlowStep = require('./flowStep').FlowStep;
var StepLog = require('./flowStep').StepLog;
var StepStatus = require('./flowStep').StepStatus;

var ProcessUpdate = {};

ProcessUpdate.stop = function (flow) {
    var deferred = Q.defer(),
        flowStep,
        stepLog,
        proj = flow.project;
    flowStep = new FlowStep('Stop process.');
    flow.service.newStep(flowStep);
    flow.service.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    proj.process.reduce(function (prev, next) {
        return prev.then(function () {
            stepLog = new StepLog(ustring.sprintf('Stop process: %s', next.name), 2, 'info');
            flow.service.updateStep(flowStep, stepLog);
            return next.toggle(0, true);
        });
    }, Process.getRuntimeInfo(proj.process)).then(function () {
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

ProcessUpdate.start = function (flow) {
    var deferred = Q.defer(),
        flowStep,
        stepLog,
        proj = flow.project;
    flowStep = new FlowStep('Start process.');
    flow.service.newStep(flowStep);
    flow.service.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    proj.process.reduce(function (prev, next) {
        return prev.then(function () {
            if (Project.lastState) {
                if (!next.project.isWatching || !next.isWatching) {
                    stepLog = new StepLog(ustring.sprintf('Project/process watching switch is off, skip: %s', next.name), 2, 'warn');
                    flow.service.updateStep(flowStep, stepLog);
                    return Q();
                }
                stepLog = new StepLog(ustring.sprintf('Start process: %s', next.name), 2, 'info');
                flow.service.updateStep(flowStep, stepLog);
                return next.toggle(1);
            }
            stepLog = new StepLog(ustring.sprintf('Global watching switch off, skip: %s', next.name), 2, 'warn');
            flow.service.updateStep(flowStep, stepLog);
            return Q();
        });
    }, Process.getRuntimeInfo(proj.process)).then(function () {
        flow.service.updateStep(flowStep, new StepLog('End...', 1, 'info'));
        flowStep.status = StepStatus.Success;
        deferred.resolve(flow);
    }).catch(function (err) {
        stepLog = new StepLog(ustring.sprintf('fail, reason: %s', err), 1, 'error');
        flowStep.status = StepStatus.Failed;
        flow.service.updateStep(flowStep, stepLog);
        flow.error = err;
        deferred.reject(flow);
    });
    return deferred.promise;
};

module.exports = ProcessUpdate;
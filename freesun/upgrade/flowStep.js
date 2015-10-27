/**
 * Created by liuxinyi on 2015/8/26.
 */
/*jslint node:true */
"use strict";
var ustring = require('underscore.string');
function FlowStep(name, logLevel) {
    this.name = name;
    this.status = 0;
    if (logLevel) {
        this.logLevel = logLevel;
    } else {
        this.logLevel = 'info';
    }
    this.logs = [];
}

function StepLog(msg, level, logLevel) {
    this.msg = msg;
    this.level = level;
    this.logLevel = logLevel;
    this.time = (function () {
        var now = new Date();
        return ustring.sprintf('%s-%s-%s %s-%s-%s', now.getFullYear(), now.getMonth() + 1,
            now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    }());
}

var StepStatus = {
    Failed: -1,
    NotExecute: 0,
    Success: 1
};

module.exports = {
    FlowStep: FlowStep,
    StepLog: StepLog,
    StepStatus: StepStatus
};
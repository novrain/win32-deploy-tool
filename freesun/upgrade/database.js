/**
 * Created by rain on 2015/8/20.
 */
/*jslint node:true */
"use strict";
var Q = require('q');
var path = require('path');
var fs = require('fs');
var extend = require('underscore').extend;
var utring = require('underscore.string');
var uuid = require('node-uuid');

var sqlcmd = require('../tools/sqlcmd');
var FlowStep = require('./flowStep').FlowStep;
var StepLog = require('./flowStep').StepLog;
var StepStatus = require('./flowStep').StepStatus;

function Database() {
}

var backup = function (flow) {
    var sqlCmd = flow.project.sqlCmd,
        backupOptions = extend({}, sqlCmd.loginTemplate, sqlCmd.queryTemplate),
        deferred = Q.defer(),
        targetFile = sqlCmd.backupDBFile,
        flowStep,
        stepLog;
    if (sqlCmd.keepOldBackup) {
        targetFile = path.join(path.dirname(targetFile), uuid.v4() + '.bak');
        flow.project.workspace.backupDBFile = targetFile;
    }
    flowStep = new FlowStep('Backup database.');
    flow.service.newStep(flowStep);
    flow.service.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    backupOptions.query = utring.sprintf("BACKUP DATABASE [%s] TO DISK = '%s' WITH STATS=10", sqlCmd.loginTemplate.database, targetFile);
    sqlcmd(backupOptions, function (data) {
        stepLog = new StepLog(data, 2, 'info');
        flow.service.updateStep(flowStep, stepLog);
    }).then(
        function () {
            stepLog = new StepLog('End...', 1, 'info');
            flowStep.status = StepStatus.Success;
            flow.service.updateStep(flowStep, stepLog);
            deferred.resolve(flow);
        },
        function (err) {
            stepLog = new StepLog('Fail. reason:' + err, 1, 'error');
            flowStep.status = StepStatus.Failed;
            flow.service.updateStep(flowStep, stepLog);
            deferred.reject(flow);
        }
    );
    return deferred.promise;
};
Database.backup = backup;

var restore = function (flow, check) {
    var sqlCmd = flow.project.sqlCmd,
        restoreOptions = extend({}, sqlCmd.loginTemplate, sqlCmd.queryTemplate),
        deferred = Q.defer(),
        flowStep,
        stepLog,
        dependStep,
        targetFile = flow.project.workspace.backupDBFile;
    flowStep = new FlowStep('Restore Database.', 'warn');
    flow.service.newStep(flowStep);
    flow.service.updateStep(flowStep, new StepLog('Begin...', 1, 'warn'));
    dependStep = flow.service.findStep('Execute sql scripts.');
    //change connect database when execute restore operation.
    restoreOptions.database = 'master';
    if (check && dependStep && dependStep.status !== StepStatus.NotExecute) {
        restoreOptions.query = utring.sprintf("RESTORE DATABASE [%s] FROM DISK = '%s' WITH STATS=10,REPLACE", sqlCmd.loginTemplate.database, targetFile);
        sqlcmd(restoreOptions, function (data) {
            stepLog = new StepLog(data, 2, 'info');
            flow.service.updateStep(flowStep, stepLog);
        }).then(
            function () {
                stepLog = new StepLog('End...', 1, 'warn');
                flowStep.status = StepStatus.Success;
                flow.service.updateStep(flowStep, stepLog);
                deferred.resolve(flow);
            },
            function (err) {
                stepLog = new StepLog('Fail. reason:' + err, 1, 'error');
                flowStep.status = StepStatus.Failed;
                flow.service.updateStep(flowStep, stepLog);
                deferred.reject(flow);
            }
        );
    } else {
        stepLog = new StepLog('End...', 1, 'warn');
        flowStep.status = StepStatus.Success;
        flow.service.updateStep(flowStep, stepLog);
        deferred.resolve(flow);
    }
    return deferred.promise;
};
Database.restore = restore;

var executeSqls = function (flow) {
    var sqlCmd = flow.project.sqlCmd,
        deferred = Q.defer(),
        flowStep,
        stepLog,
        executeOptions = extend({}, sqlCmd.loginTemplate, sqlCmd.ioTemplate),
        sqlFiles;
    flowStep = new FlowStep('Execute sql scripts.');
    flow.service.newStep(flowStep);
    flow.service.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    try {
        sqlFiles = fs.readdirSync(sqlCmd.inputFiles);
    } catch (err) {
        stepLog = new StepLog('Error. reason:' + err, 1, 'warn');
        stepLog = new StepLog('End...', 1, 'info');
        flowStep.status = StepStatus.Success;
        flow.service.updateStep(flowStep, stepLog);
        deferred.resolve(flow);
        return deferred.promise;
    }
    executeOptions.inputFiles = !sqlFiles ? [] : sqlFiles.filter(function (file) {
        return path.extname(file) === '.sql';
    }).map(function (file) {
        return path.join(sqlCmd.inputFiles, file);
    });
    if (executeOptions.inputFiles && executeOptions.inputFiles.length > 0) {
        executeOptions.outputFile = sqlCmd.outputFile;
        sqlcmd(executeOptions, function (data) {
            stepLog = new StepLog(data, 2, 'info');
            flow.service.updateStep(flowStep, stepLog);
        }).then(
            function () {
                stepLog = new StepLog('End...', 1, 'info');
                flowStep.status = StepStatus.Success;
                flow.service.updateStep(flowStep, stepLog);
                deferred.resolve(flow);
            },
            function (err) {
                stepLog = new StepLog('Fail. reason:' + err, 1, 'error');
                flowStep.status = StepStatus.Failed;
                flow.service.updateStep(flowStep, stepLog);
                deferred.reject(flow);
            }
        );
    } else {
        stepLog = new StepLog('End...', 1, 'info');
        flowStep.status = StepStatus.Success;
        flow.service.updateStep(flowStep, stepLog);
        deferred.resolve(flow);
    }
    return deferred.promise;
};
Database.executeSqls = executeSqls;

module.exports = Database;
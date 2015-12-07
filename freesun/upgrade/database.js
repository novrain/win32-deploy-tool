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

function fillZero(str) {
    var strs = str.split('.');
    var rs = [];
    strs.forEach(function (s) {
        s = '0000' + s;
        rs.push(s.substring(s.length - 4, s.length));
    });

    return rs.join('.');
}

function getCompareStr(v) {
    var vs = v.split('-');
    var from = fillZero(vs[0]);
    var to = fillZero(vs[1]);
    return from + '-' + to;
}

function compareVersion(v1, v2) {
    v1 = getCompareStr(v1);
    v2 = getCompareStr(v2);

    if (v1 < v2) return -1;
    if (v1 == v2) return 0;
    if (v1 > v2) return 1;
}

function getMinVersion(versions) {
    var min = versions[0];
    if (versions.length > 1) {
        for (var i = 1; i < versions.length; i++) {
            if (compareVersion(min, versions[i]) > 0) {
                min = versions[i];
            }
        }
    }

    return min;
}

var executeSqls = function (flow) {
    var sqlCmd = flow.project.sqlCmd,
        deferred = Q.defer(),
        SCHEMA = 'schema',
        DATA = 'data',
        flowStep,
        stepLog,
        executeOptions = extend({}, sqlCmd.loginTemplate, sqlCmd.ioTemplate),
        sqlSchemaFiles,
        sqlDataFiles,
        sqlFiles = [];
    flowStep = new FlowStep('Execute sql scripts.');
    flow.service.newStep(flowStep);
    flow.service.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    try {
        var versions = fs.readdirSync(sqlCmd.inputFiles);
        while (versions.length > 0) {
            var minVersion = getMinVersion(versions);
            sqlSchemaFiles = fs.readdirSync(path.join(sqlCmd.inputFiles, minVersion, SCHEMA));
            sqlDataFiles = fs.readdirSync(path.join(sqlCmd.inputFiles, minVersion, DATA));
            sqlFiles = sqlFiles.concat(!sqlSchemaFiles ? [] : sqlSchemaFiles.filter(function (file) {
                return path.extname(file) === '.sql';
            }).map(function (file) {
                return path.join(sqlCmd.inputFiles, minVersion, SCHEMA, file);
            }));
            sqlFiles = sqlFiles.concat(!sqlDataFiles ? [] : sqlDataFiles.filter(function (file) {
                return path.extname(file) === '.sql';
            }).map(function (file) {
                return path.join(sqlCmd.inputFiles, minVersion, DATA, file);
            }));

            versions.splice(versions.indexOf(minVersion), 1);
        }
    } catch (err) {
        stepLog = new StepLog('Error. reason:' + err, 1, 'warn');
        stepLog = new StepLog('End...', 1, 'info');
        flowStep.status = StepStatus.Success;
        flow.service.updateStep(flowStep, stepLog);
        deferred.resolve(flow);
        return deferred.promise;
    }
    executeOptions.inputFiles = sqlFiles;
    console.log(executeOptions.inputFiles);

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
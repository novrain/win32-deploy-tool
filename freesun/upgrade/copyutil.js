/**
 * Created by rain on 2015/8/27.
 */
/*jslint node:true */
"use strict";

var Q = require('q');
var fs = require('fs-extra');
var path = require('path');
var ustring = require('underscore.string');

var FlowStep = require('./flowStep').FlowStep;
var StepLog = require('./flowStep').StepLog;
var StepStatus = require('./flowStep').StepStatus;

var CopyUtil = {};

function getBackupDir(flow) {
    if (!flow.project.workspace.keepOldBackup) {
        return path.join(flow.project.workspace.backup, 'temp', flow.project.name);
    } else {
        return path.join(flow.project.workspace.backup, flow.project.name, 'now');
    }
}

var backup = function (flow, targetArray, desc) {
    var deferred = Q.defer(),
        flowStep,
        stepLog,
        targetDir;
    flowStep = new FlowStep(ustring.sprintf('Backup %s.', desc));
    flow.service.newStep(flowStep);
    flow.service.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    targetDir = getBackupDir(flow);
    if (Array.isArray(targetArray)) {
        targetArray.reduce(function (prev, next, i) {
            return prev.then(function () {
                stepLog = new StepLog(ustring.sprintf('%s backup: %s...', desc, next.name), 2, 'info');
                flow.service.updateStep(flowStep, stepLog);
                var dir = path.join(targetDir, next.path);
                return Q.nfcall(fs.emptyDir, dir)
                    .then(function () {
                        stepLog = new StepLog(ustring.sprintf('%s backup: copy %s to %s...', desc, next.absDir, dir), 2, 'info');
                        flow.service.updateStep(flowStep, stepLog);
                        return Q.nfcall(fs.copy, next.absDir, dir);
                    })
                    .then(function () {
                        flow.service.updateStep(flowStep, new StepLog(ustring.sprintf('%s backup: %s, done.', desc, next.name), 2, 'info'));
                    });
            });
        }, Q()).then(function () {
            flow.service.updateStep(flowStep, new StepLog('End...', 1, 'info'));
            flowStep.status = StepStatus.Success;
            deferred.resolve(flow);
        }).catch(function (err) {
            stepLog = new StepLog(ustring.sprintf('Fail, reason: %s', err), 2, 'error');
            flowStep.status = StepStatus.Failed;
            flow.service.updateStep(flowStep, stepLog);
            deferred.reject(flow);
        });
    } else {
        flow.service.updateStep(flowStep, new StepLog('End...', 1, 'info'));
        flowStep.status = StepStatus.Success;
        deferred.resolve(flow);
    }
    return deferred.promise;
};

var deploy = function (flow, targetArray, targetDir, desc) {
    var deferred = Q.defer(),
        step = new FlowStep(ustring.sprintf('Deploy %s.', desc)),
        sourceDir = flow.project.workspace.decompress;
    flow.service.newStep(step);
    flow.service.updateStep(step, new StepLog('Begin...', 1, 'info'));
    targetArray.reduce(function (prev, next) {
        return prev.then(function () {
            flow.service.updateStep(step, new StepLog('deploying ' + next.name + '..', 2, 'info'));
            var target = targetDir + '/' + next.path;
            var source = sourceDir + '/' + next.path;

            return Q.nfcall(fs.emptyDir, target)
                .then(function () {
                    return Q.nfcall(fs.copy, source, target);
                })
                .then(function () {
                    flow.service.updateStep(step, new StepLog(next.name + 'deployed.', 2, 'info'));
                    return Q();
                });
        });
    }, Q()).then(function () {
        step.status = StepStatus.Success;
        flow.service.updateStep(step, new StepLog('End.', 1, 'info'));
        deferred.resolve(flow);
    }).catch(function (err) {
        step.status = StepStatus.Failed;
        flow.service.updateStep(step, new StepLog('Fail. reason:' + err, 1, 'error'));
        deferred.reject(flow);
    });

    return deferred.promise;
};

var setup = function (flow, targetArray, targetDir, desc) {
    var deferred = Q.defer(),
        step = new FlowStep(ustring.sprintf('Setup %s.', desc));

    flow.service.newStep(step);
    flow.service.updateStep(step, new StepLog('Begin...', 1, 'info'));
    targetArray.reduce(function (prev, p) {
        return prev.then(function () {
            var config = p.config;

            if (!config) {
                flow.service.updateStep(step, new StepLog(p.name + ' has no config', 2, 'warn'));
                return Q();
            }
            flow.service.updateStep(step, new StepLog('setup ' + p.name + '..', 2, 'info'));
            return config.reduce(function (prev, c) {
                var configFile = path.join(targetDir, p.path, c.name);
                var items = c.items;
                if (!items) {
                    flow.service.updateStep(step, new StepLog('config:[' + c.name + '] has no item', 2, 'warn'));
                    return Q();
                }

                return Q.nfcall(fs.readFile, configFile + '.tmpl')
                    .then(function (data) {
                        items.forEach(function (it) {
                            while (data.toString().indexOf(it.key) !== -1) {
                                data = data.toString().replace(it.key, it.value);
                            }
                        });

                        return Q.nfcall(fs.writeFile, configFile, data);
                    });
            }, Q()).then(function () {
                flow.service.updateStep(step, new StepLog('setup ' + p.name + ' completed.', 2, 'info'));
                return Q();
            });
        });
    }, Q()).then(function () {
        step.status = StepStatus.Success;
        flow.service.updateStep(step, new StepLog('End...', 1, 'info'));
        deferred.resolve(flow);
    }).catch(function (err) {
        step.status = StepStatus.Failed;
        flow.service.updateStep(step, new StepLog('Fail. reason:' + err, 1, 'error'));
        deferred.reject(flow);
    });

    return deferred.promise;
};

var migrate = function (flow, targetArray, targetDir, desc) {
    var deferred = Q.defer();
    var step = new FlowStep(ustring.sprintf('Migrate %s.', desc));
    flow.service.newStep(step);
    flow.service.updateStep(step, new StepLog('Begin...', 1, 'info'));

    var backup = getBackupDir(flow);

    var internalCopy = function (p, c) {
        var source = path.join(backup, p.path, c.from);
        var des = path.join(targetDir, p.path, c.to);
        var copy = Q.denodeify(fs.copy);
        return copy(source, des)
            .then(function () {
                flow.service.updateStep(step, new StepLog('copy ' + source + ' to ' + des + ' completed.', 2, 'info'));
                return Q();
            });
    };

    var internalMigrate = function (p) {
        var copy = p.copy;
        if (!copy) {
            flow.service.updateStep(step, new StepLog(p.name + ' has no copy', 2, 'warn'));
            return Q();
        } else {
            flow.service.updateStep(step, new StepLog('migrate ' + p.name + '..', 2, 'info'));
            return copy.reduce(function (prev, next) {
                    return prev.then(function () {
                        return internalCopy(p, next);
                    });
                }, Q())
                .then(function () {
                    flow.service.updateStep(step, new StepLog(p.name + ' migrate completed.', 2, 'info'));
                    return Q();
                });
        }
    };

    targetArray.reduce(function (prev, next) {
        return prev.then(function () {
            return internalMigrate(next);
        });
    }, Q()).then(function () {
        step.status = StepStatus.Success;
        flow.service.updateStep(step, new StepLog('End...', 1, 'info'));
        deferred.resolve(flow);
    }).catch(function (err) {
        step.status = StepStatus.Failed;
        flow.service.updateStep(step, new StepLog('Fail. reason:' + err, 1, 'error'));
        deferred.reject(flow);
    });

    return deferred.promise;
};

var restore = function (flow, targetArray, desc) {
    var deferred = Q.defer(),
        flowStep,
        stepLog,
        targetDir;
    flowStep = new FlowStep(ustring.sprintf('Restore %s.', desc), 'warn');
    flow.service.newStep(flowStep);
    flow.service.updateStep(flowStep, new StepLog('Begin...', 1, 'warn'));

    if (!flow.service.findStep(ustring.sprintf('Backup %s.', desc)) || flow.service.findStep(ustring.sprintf('Backup %s.', desc)).status !== StepStatus.Success) {
        flowStep.status = StepStatus.Failed;
        flow.service.updateStep(flowStep, new StepLog('skipped. reason: there is no backup found', 2, 'error'));
        deferred.resolve(flow);
        return;
    }
    targetDir = getBackupDir(flow);

    if (Array.isArray(targetArray)) {
        targetArray.reduce(function (prev, next, i) {
            return prev.then(function () {
                stepLog = new StepLog(ustring.sprintf('%s restore: %s...', desc, next.name), 2, 'warn');
                flow.service.updateStep(flowStep, stepLog);
                var dir = path.join(targetDir, next.path);
                return Q.nfcall(fs.emptyDir, next.absDir)
                    .then(function () {
                        stepLog = new StepLog(ustring.sprintf('%s restore: copy %s to %s...', desc, dir, next.absDir), 2, 'warn');
                        flow.service.updateStep(flowStep, stepLog);
                        return Q.nfcall(fs.copy, dir, next.absDir);
                    })
                    .then(function () {
                        flow.service.updateStep(flowStep, new StepLog(ustring.sprintf('%s restore: %s, done.', desc, next.name), 2, 'warn'));
                    });
            });
        }, Q()).then(function () {
            flow.service.updateStep(flowStep, new StepLog('End...', 1, 'warn'));
            flowStep.status = StepStatus.Success;
            deferred.resolve(flow);
        }).catch(function (err) {
            stepLog = new StepLog(ustring.sprintf('Fail, reason: %s', err), 2, 'error');
            flowStep.status = StepStatus.Failed;
            flow.service.updateStep(flowStep, stepLog);
            deferred.reject(flow);
        });
    } else {
        flow.service.updateStep(flowStep, new StepLog('End...', 1, 'warn'));
        flowStep.status = StepStatus.Success;
        deferred.resolve(flow);
    }
    return deferred.promise;
};


CopyUtil.backupProcess = function (flow) {
    return backup(flow, flow.project.process, 'Process');
};

CopyUtil.backupWebServer = function (flow) {
    return backup(flow, flow.project.webserver, 'WebServer');
};

CopyUtil.deployWeb = function (flow) {
    return deploy(flow, flow.project.webserver, flow.project.workspace.webDir, 'WebServer');
};

CopyUtil.deployProcess = function (flow) {
    return deploy(flow, flow.project.process, flow.project.workspace.processDir, 'Process');
};

CopyUtil.setupWeb = function (flow) {
    return setup(flow, flow.project.webserver, flow.project.workspace.webDir, 'WebServer');
};

CopyUtil.setupProcess = function (flow) {
    return setup(flow, flow.project.process, flow.project.workspace.processDir, 'Process');
};

CopyUtil.migrateWeb = function (flow) {
    return migrate(flow, flow.project.webserver, flow.project.workspace.webDir, 'WebServer');
};

CopyUtil.migrateProcess = function (flow) {
    return migrate(flow, flow.project.process, flow.project.workspace.processDir, 'Process');
};

CopyUtil.restoreWeb = function (flow) {
    return restore(flow, flow.project.webserver, 'WebServer');
};

CopyUtil.restoreProcess = function (flow) {
    return restore(flow, flow.project.process, 'Process');
};

module.exports = CopyUtil;
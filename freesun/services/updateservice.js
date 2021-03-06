﻿/**
 * Created by rain on 2015/8/25.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var WebSocketServer = require('ws').Server;
var path = require('path');
var fs = require('fs-extra');
var Q = require('q');
var exec = require('child_process').exec;
var ustring = require('underscore.string');
var events = require("events");
var util = require("util");
var uuid = require('node-uuid');
var merge = require('lodash').merge;
var moment = require('moment');

var db = require('../db/database');

var unzip = require('../tools/unzip/unzip');
var logger = require('../env/logger');
var config = require('../env/config');
var Project = require('../models/project');

var FlowStep = require('../upgrade/flowStep').FlowStep;
var StepLog = require('../upgrade/flowStep').StepLog;
var StepStatus = require('../upgrade/flowStep').StepStatus;

var wsconfig = config.ws;

function Us(wss) {
    this.wss = wss;
    this.isRunning = false;
    this.flow = null;
    this.steps = {};
    fs.mkdirsSync(Project.deletedDir);
    fs.mkdirsSync(Us.tempDir);
    fs.mkdirsSync(Us.decompress);
    fs.mkdirsSync(Us.backupRoot);
    fs.mkdirsSync(Us.uploads);
}

util.inherits(Us, events.EventEmitter);


Us.ROOT = path.join(__dirname, '../../');

Us.decompress = path.join(__dirname, '../../workspace', 'decompress');
Us.backupRoot = path.join(__dirname, '../../workspace', 'backup');
Us.uploads = path.join(__dirname, '../../uploads');
Us.deployScript = 'deploy.js';
Us.tempDir = path.join(__dirname, '..\\temp');
Us.deployFlowSrc = path.join(Us.decompress, Us.deployScript);
Us.versionInfoFileSrc = path.join(Us.decompress, Project.versionInfoFile);
Us.deployFlowTarget = path.join(Us.tempDir, Us.deployScript);
Us.sqlDir = path.join(Us.decompress, 'sql');
Us.sqlOutput = path.join(Us.decompress, 'sql', 'output.txt');

Us.INSTALL = 0;
Us.UPDATE = 1;
Us.DELETE = 2;

Us.prototype.newStep = function (flowStep) {
    var step = this.steps[flowStep.name];
    if (step) {
        step.status = flowStep.status;
        step.logs = step.logs.concat(flowStep.logs);
        this.emit('process', flowStep, flowStep.logs);
    } else {
        this.steps[flowStep.name] = flowStep;
        this.emit('process', flowStep, [new StepLog(flowStep.name, 0, flowStep.logLevel)]);
        if (flowStep.logs.length > 0) {
            this.emit('process', flowStep, flowStep.logs);
        }
    }
};

Us.prototype.updateStep = function (flowStep, stepLog) {
    var step = this.steps[flowStep.name];
    if (step) {
        step.status = flowStep.status;
        step.logs.push(stepLog);
        this.emit('process', flowStep, [stepLog]);
    } else {
        flowStep.logs.push(stepLog);
        this.steps[flowStep.name] = flowStep;
        this.emit('process', flowStep, [new StepLog(flowStep.name, 0, 'info')]);
        this.emit('process', flowStep, flowStep.logs);
    }
};

Us.prototype.dumpSteps = function () {
    return JSON.stringify(this.steps);
};

Us.prototype.clearSteps = function () {
    this.steps = {};
};

Us.prototype.findStep = function (name) {
    return this.steps[name];
};

Us.prototype.start = function () {
    Project.init();
    events.EventEmitter.apply(this);
    var that = this,
        service = function (interval) {
            interval = interval || 1000 * 60 * 60 * 24;
            setTimeout(function () {
                //Todo clear backup file
                //Us.clear(Us.backupRoot);
                //Us.clear(Us.uploads);
                //service(interval)
            }, interval);
        };
    service(wsconfig.backupClearInterval);
    this.wss.broadcast = function (data) {
        that.wss.clients.forEach(function each(client) {
            try {
                client.send(data);
            } catch (e) {
                logger.error('Fail to send message to client[%s], reason: %s.', client, e.stack);
            }
        });
    };
    this.wss.on('connection', function connection(ws) {
        var step;
        if (that.status()) {
            //push current status flow.dumpMsg
            for (step in that.steps) {
                ws.send(JSON.stringify(step.logs));
            }
            //ws.send(JSON.stringify(that.flow.dumpMsg()));
        } else {
            //nothing;
        }
    });
    this.on('process', function (currentStep, stepLog) {
        that.wss.broadcast(JSON.stringify(stepLog));
        stepLog.forEach(function (log) {
            logger.log(log.logLevel, log.msg);
        });
    });
};

Us.prototype.status = function () {
    return this.isRunning;
};

Us.prototype.finish = function (flow) {
    var theReal = flow,
        pj;
    this.isRunning = false;
    if (theReal !== undefined) {
        if (theReal.operation === Us.UPDATE && flow.newFlow !== undefined) {
            theReal = flow.newFlow;
        }
        try {
            if (theReal.project.workspace.rootDir) {
                var verFile = path.join(theReal.project.workspace.rootDir, Project.versionInfoFile);
                fs.copySync(Us.versionInfoFileSrc, verFile);
                pj = Project.findById(theReal.project.id);
                //update version
                pj.version = JSON.parse(fs.readFileSync(verFile));
            }
        } catch (err) {
            logger.error(`Can not read version info: ${err.stack}`);
        }
        this.recordHistory(flow, true);
    }
    setTimeout(function () {
        Project.resumeWatching();
    }, 2000);
    this.wss.broadcast('~!@#$over');
};

Us.prototype.failed = function (flow) {
    this.isRunning = false;
    this.recordHistory(flow, false);
    setTimeout(function () {
        Project.resumeWatching();
    }, 2000);
    this.wss.broadcast('~!@#$error');
};

Us.prototype.recordHistory = function (flow, result) {
    /**update version info; except **/
    try {
        var now,
            record,
            theReal = flow;
        now = new Date();
        if (flow) {
            if (flow.operation === Us.UPDATE && flow.newFlow !== undefined) {
                theReal = flow.newFlow;
                flow.error = flow.newFlow.error + flow.oldFlow.error;
            }
            if (theReal.project !== undefined) {
                if (theReal.project.version === undefined) {
                    theReal.project.version = {};
                }
                record = {
                    projectid: theReal.project.id,
                    name: theReal.project.name,
                    revision: theReal.project.version.revision,
                    when: moment(now).format('YYYY-MM-DD HH:mm:ss'),
                    result: result ? 1 : 0,
                    buildtime: theReal.project.version.datetime,
                    reason: result ? '' : flow.error.toString(),
                    operation: theReal.operation
                };
                db.orm.ProjectHistory.create(record).then(function () {
                    logger.info("Record a history:", record);
                }).catch(function (err) {
                    logger.info("Fail to record a history:", record, err);
                });
            } else {
                logger.error('Can not record history, invalid flow');
            }
        }
    } catch (err) {
        logger.error(`Can not record history: ${err.stack}`);
    }
};

Us.prototype.check = function () {
    if (this.isRunning) {
        throw new Error('An operation progress is running.');
    }
};

Us.prototype.install = function (pkg) {
    var projWrokspace = {workspace: {}},
        that = this;
    this.check();
    try {
        this.isRunning = true;
        projWrokspace.workspace.package = pkg;
        projWrokspace.workspace.decompress = Us.decompress;
        projWrokspace.workspace.backupRoot = Us.backupRoot;
        this.begin(projWrokspace)
            .then(function () {
                return that.loadInstallScript(projWrokspace);
            }).then(function (flow) {
            flow.operation = Us.INSTALL;
            return that.flow.install(flow)
                .then(function (flow) {
                    return that.newProject(flow);
                })
                .then(function (flow) {
                    that.finish(flow);
                })
                .catch(function (flow) {
                    that.failed(flow);
                    return that.flow.uninstall(flow);
                });
        }).catch(function (flow) {
            //can not record a history
            that.failed(flow);
            //logger.error(err);
        });
    } catch (e) {
        //can not record a history
        that.failed();
        throw new Error(ustring.sprintf('This project does not exist or can not be updated. e: %s', e.stack));
    }
};

Us.prototype.newProject = function (flow) {
    var flowStep,
        deferred = Q.defer();
    flowStep = new FlowStep('Record installed project.');
    this.newStep(flowStep);
    this.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    Project.addProject(flow.project);
    //不能随意手工添加 ID.js
    fs.copySync(Us.deployFlowSrc, path.join(Project.projectDir, flow.project.id + '.js'));
    flowStep.status = StepStatus.Success;
    this.updateStep(flowStep, new StepLog('End...', 1, 'info'));
    deferred.resolve(flow);
    return deferred.promise;
};

Us.prototype.loadInstallScript = function (projWrokspace) {
    var tempProj,
        InstallFlow,
        that = this,
        flowStep,
        proj,
        deferred = Q.defer();
    flowStep = new FlowStep('Load install script.');
    that.newStep(flowStep);
    that.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    try {
        fs.copySync(Us.deployFlowSrc, Us.deployFlowTarget);
        delete require.cache[require.resolve(Us.deployFlowTarget)];
        InstallFlow = require(Us.deployFlowTarget).Flow;
        //不能随意增加 ID.js
        tempProj = Project.makeProject(require(Us.deployFlowTarget).project, Project.getId(), Us.decompress);
        proj = merge(tempProj, projWrokspace); // merge, dynamic first.
        if (proj.sqlCmd) {
            proj.sqlCmd.inputFiles = Us.sqlDir;
            proj.sqlCmd.outputFile = Us.sqlOutput;
        }
        that.flow = new InstallFlow(proj, that);
        that.checkConfig(that.flow);
        flowStep.status = StepStatus.Success;
        that.updateStep(flowStep, new StepLog(
            ustring.sprintf('Project info:  %s, id:%s', proj.name, proj.id), 1, 'info'));
        that.updateStep(flowStep, new StepLog('End...', 1, 'info'));
        deferred.resolve(that.flow);
    } catch (e) {
        flowStep.status = StepStatus.Failed;
        that.updateStep(flowStep, new StepLog('Fail. reason: ' + e.stack, 1, 'error'));
        deferred.reject(e);
    }
    return deferred.promise;
};

Us.prototype.update = function (pjid, pkg) {
    var oldProj = Project.findById(pjid),
        that = this,
        projWorkspace = {workspace: {}};
    this.check();
    try {
        this.isRunning = true;
        projWorkspace.workspace.package = pkg;
        projWorkspace.workspace.decompress = Us.decompress;
        projWorkspace.workspace.backupRoot = Us.backupRoot;
        this.begin(projWorkspace)
            .then(function () {
                oldProj = merge(oldProj, projWorkspace);
                return that.loadUpdateScript(oldProj, projWorkspace);
            }).then(function (flow) {
                flow.operation = flow.newFlow.operation = flow.oldFlow.operation = Us.UPDATE;
                that.flow.oldFlow.project.workspace.keepOldBackup = that.flow.newFlow.project.workspace.keepOldBackup;
                return that.flow.newFlow.update(flow)
                    .then(function () {
                        return that.updateProject(flow.newFlow);
                    })
                    .then(function () {
                        if (!flow.newFlow.project.workspace.keepOldBackup) {
                            var p = path.join(flow.oldFlow.project.workspace.backup, 'temp', flow.oldFlow.project.name);
                            fs.emptyDirSync(p);
                            fs.rmdirSync(p);
                        } else {
                            var number = 0;
                            var pb = path.join(flow.oldFlow.project.workspace.backup, flow.oldFlow.project.name);
                            if (fs.existsSync(pb)) {
                                var files = fs.readdirSync(pb);
                                files.forEach(function (f) {
                                    if (Number(f) > number) {
                                        number = Number(f);
                                    }
                                });
                                var nowPath = path.join(pb, 'now');
                                if (fs.existsSync(nowPath)) {
                                    fs.renameSync(nowPath, path.join(pb, (number + 1).toString()));
                                }
                            }

                            if (fs.existsSync(nowPath)) {
                                fs.emptyDirSync(nowPath);
                            }
                        }
                        return Q.Promise.resolve(true);
                    })
                    .catch(function () {
                        return that.flow.newFlow.rollback(that.flow).then(function () {
                            return Q.Promise.resolve(false);
                        });
                    }).then(function (isOK) {
                        if (isOK) {
                            that.finish(flow);
                        } else {
                            that.failed(flow);
                        }
                    });
            }
        ).catch(function (flow) {
            that.failed(flow);
            return Q();
            //logger.error(err);
        });
    } catch (e) {
        //can not record a history
        that.failed();
        throw new Error(ustring.sprintf('This project does not exist or can not be updated. e: %s', e.stack));
    }
};

Us.prototype.updateProject = function (flow) {
    var flowStep,
        deferred = Q.defer(),
        that = this;
    flowStep = new FlowStep('Update installed project.');
    this.newStep(flowStep);
    this.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    //Overwrite(delete new) new ProjectInfo.
    Project.deleteById(flow.project.id);
    Project.addProject(flow.project);

    Project.loadHistoryInfo([flow.project]).then(function () {
        fs.copySync(Us.deployFlowSrc, path.join(Project.projectDir, flow.project.id + '.js'));
        flowStep.status = StepStatus.Success;
        that.updateStep(flowStep, new StepLog('End...', 1, 'info'));
        deferred.resolve(flow);
    }, function (err) {
        deferred.resolve(flow);
        logger.error('Failed to refresh history info.', err);
    });
    return deferred.promise;
};

Us.prototype.loadUpdateScript = function (oldProj, projWorkspace) {
    var deferred = Q.defer(),
        tempProj,
        NewFlow,
        OldFlow,
        that = this,
        flowStep,
        proj;
    flowStep = new FlowStep('Load update script.');
    that.newStep(flowStep);
    that.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    try {
        fs.copySync(Us.deployFlowSrc, Us.deployFlowTarget);
        delete require.cache[require.resolve(Us.deployFlowTarget)];
        delete require.cache[require.resolve(path.join(Project.projectDir, oldProj.id + '.js'))];
        tempProj = Project.makeProject(require(Us.deployFlowTarget).project, oldProj.id, Us.decompress);
        proj = merge(tempProj, projWorkspace); // merge, new info first.
        NewFlow = require(Us.deployFlowTarget).Flow;
        OldFlow = require(path.join(Project.projectDir, oldProj.id + '.js')).Flow;
        if (proj.sqlCmd) {
            proj.sqlCmd.inputFiles = Us.sqlDir;
            proj.sqlCmd.outputFile = Us.sqlOutput;
        }
        that.flow = {newFlow: new NewFlow(proj, that), oldFlow: new OldFlow(oldProj, that)};
        that.checkConfig(that.flow.newFlow);
        that.checkConfig(that.flow.oldFlow);
        that.updateStep(flowStep, new StepLog(
            ustring.sprintf('Project info: %s, id:%s', that.flow.oldFlow.project.name, that.flow.oldFlow.project.id), 1, 'info'));
        flowStep.status = StepStatus.Success;
        that.updateStep(flowStep, new StepLog('End...', 1, 'info'));
        deferred.resolve(that.flow);
    } catch (e) {
        flowStep.status = StepStatus.Failed;
        that.updateStep(flowStep, new StepLog('Fail. reason: ' + e.stack, 1, 'error'));
        deferred.reject(e);
    }
    return deferred.promise;
};

Us.prototype.checkConfig = function (flow) {
    if (flow && flow.project && flow.project.workspace && flow.project.workspace.rootDir) {
        if (flow.project.workspace.processDir != undefined) {
            flow.project.workspace.processDir = path.join(flow.project.workspace.rootDir, flow.project.workspace.processDir);
        }
        if (flow.project.workspace.webDir != undefined) {
            flow.project.workspace.webDir = path.join(flow.project.workspace.rootDir, flow.project.workspace.webDir);
        }
        //clear
        flow.error = '';
    }
};

Us.prototype.begin = function (projWorkspace) {
    var defer = Q.defer(),
        that = this,
        pkgPath = projWorkspace.workspace.package,
        flowStep,
        decompressPath = projWorkspace.workspace.decompress;
    this.clearSteps();
    flowStep = new FlowStep('Unzip package.');
    this.newStep(flowStep);
    this.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    this.updateStep(flowStep, new StepLog(ustring.sprintf('Package:  %s', pkgPath), 1, 'info'));
    Project.pauseWatching();
    projWorkspace.workspace.backup = projWorkspace.workspace.backupRoot;
    Q.nfcall(fs.emptyDir, decompressPath)
        .then(function () {
            var reader = fs.createReadStream(pkgPath);
            reader.pipe(unzip.Extract({path: decompressPath}));
            reader.on('end', function () {
                setTimeout(function () {
                    flowStep.status = StepStatus.Success;
                    that.updateStep(flowStep, new StepLog('End...', 1, 'info'));
                    defer.resolve();
                }, 5000);
            });
            reader.on('error', function (err) {
                console.log(err);
            });
        })
        .catch(function (err) {
            flowStep.status = StepStatus.Failed;
            that.updateStep(flowStep, new StepLog('Fail. reason:' + err, 1, 'error'));
            defer.reject(err);
        });
    return defer.promise;
};

Us.prototype.stop = function () {
    try {
        this.wss.close();
    } catch (e) {
        logger.error('Fail to close US server, reason: %s.', e.stack);
    }
};

Us.prototype.selfUpdate = function (pkg) {
    var reader = fs.createReadStream(pkg),
        flowStep,
        now,
        that;
    this.check();
    now = new Date();
    that = this;
    this.clearSteps();
    flowStep = new FlowStep('Self Update.');
    this.newStep(flowStep);
    this.updateStep(flowStep, new StepLog('Begin...', 1, 'info'));
    reader.pipe(unzip.Extract({path: Us.ROOT}));
    reader.on('end', function () {
        setTimeout(function () {
            exec("npm install", {cwd: Us.ROOT}, function (errIn, stdOut, stdErr) {
                var err = errIn || stdErr.trim(),
                    result = 1, // success
                    version = {revision: '', datetime: ''};
                if (/npm ERR!/g.test(err)) {
                    that.updateStep(flowStep, new StepLog(ustring.sprintf('Failed: %s', err), 1, 'error'));
                    result = 0;
                } else {
                    that.updateStep(flowStep, new StepLog(ustring.sprintf('Success: %s', stdOut), 1, 'info'));
                }
                that.updateStep(flowStep, new StepLog('End...', 1, 'info'));
                /**record operation.**/
                var exit = function () {
                    if (result === 1) { //exit and restart by pm2 when success.
                        setTimeout(function () {
                            process.exit(0);
                        }, 5000);
                    }
                };
                try {
                    var verFile = path.join(__dirname, '../env', 'version.json');
                    version = JSON.parse(fs.readFileSync(verFile));
                } catch (err) {
                    logger.error(`Can not get version info ${err.stack}`);
                }
                try {
                    db.orm.SelfUpdateHistory.create({
                        revision: version.revision,
                        when: moment(now).format('YYYY-MM-DD HH:mm:ss'),
                        result: result,
                        buildtime: version.datetime,
                        reason: result == 1 ? '' : err,
                        operation: Us.UPDATE
                    }).then(function () {
                        that.finish();
                        exit();
                    });
                } catch (err) {
                    logger.error(`Can not record self update. ${err.stack}`);
                    that.finish();
                    exit();
                }
            });
        }, 5000);
    });
};

Us.prototype.deleteById = function (pjid) {
    var defer = Q.defer();
    var proj = Project.findById(pjid);
    if (!proj) {
        defer.reject();
    } else {
        var now = Date.now();
        var record = {
            projectid: pjid,
            name: proj.name,
            revision: proj.version.revision,
            when: moment(now).format('YYYY-MM-DD HH:mm:ss'),
            result: 1,
            buildtime: proj.version.datetime,
            operation: Us.DELETE
        };
        //Project.pauseWatching();
        Project.stop(pjid, true).then(function () {
            if (Project.deleteById(pjid)) {
                db.orm.ProjectHistory.create(record).then(function () {
                    logger.info("Record a delete history:", record);
                }).catch(function (err) {
                    logger.error("Fail to record a delete history:", record, err);
                });
                //Project.resumeWatching();
                defer.resolve();
            } else {
                record.result = 0;
                db.orm.ProjectHistory.create(record).then(function () {
                    logger.info("Record a delete history:", record);
                }).catch(function (err) {
                    logger.error("Fail to record a delete history:", record, err);
                });
                //Project.resumeWatching();
                defer.reject();
            }
        }, function () {
            //Project.resumeWatching();
            defer.reject();
        });
    }
    return defer.promise;
};

module.exports = new Us(new WebSocketServer({port: wsconfig.update}));
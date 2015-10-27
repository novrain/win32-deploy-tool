/**
 * Created by rain on 2015/8/7.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var fs = require('fs');
var os = require('os');
var Q = require('q');
var exec = require('child_process').exec;
var moment = require('moment');
var ustring = require('underscore.string');

var wmic = require('../tools/wmic');
var psget = wmic.path.get;
var psdetailget = wmic.path.get;

var logger = require('../env/logger');

function Process(process) {
    this.id = process.id;
    this.name = process.name;
    this.image = process.image;
    this.path = process.path;
    this.watch = process.watch;
    this.logfile = process.logfile;
    this.project = process.project;
    //this.absPath = project.workspace.processDir + path + image
    this.absPath = process.absPath;
    //this.absDir = project.workspace.processDir + path
    this.absDir = process.absDir;
    //this.r = [];
}

function ProcessInfo(info) {
    this.spid = info.spid;
    this.pid = info.pid;
    this.status = info.status;
    this.restart = info.restart;
    this.memory = info.memory;
    this.mempec = info.mempec;
    this.uptime = info.uptime;
    this.cpupec = info.cpupec;
}

Process.prototype.runtimeInfo = function () {
    return Process.getRuntimeInfo([this]);
};

Process.prototype.toggle = function (cmd, refresh) {
    var deferred = Q.defer(),
        promise,
        info,
        that = this;
    if (refresh || !this.r) {
        promise = this.runtimeInfo();
    } else {
        promise = Q();
    }
    promise.then(function () {
        info = that.r[0];
        if (cmd === 1) {
            if (info.status !== 0) {
                deferred.resolve(ustring.sprintf('Process %s is running.', that.name));
            } else if (!fs.existsSync(that.absPath)) {
                console.log(that.absPath);
                deferred.reject(ustring.sprintf('Process %s not exist.', that.name));
            } else {
                exec("start " + that.image, {cwd: that.absDir}, function (err) {
                    if (err !== null) {
                        logger.error(err);
                        deferred.reject(ustring.sprintf('Fail to start process %s.', that.name));
                    }
                });
                deferred.resolve(ustring.sprintf('Success to start process %s.', that.name));
            }
        } else if (cmd === 0) {
            if (info.status === 0) {
                deferred.resolve(ustring.sprintf('Process %s is not running.', that.name));
            } else {
                exec("taskkill /PID " + info.pid + " /T /F", function (err) {
                    if (err !== null) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(ustring.sprintf('Success to stop process %s.', that.name));
                    }
                });
            }
        } else {
            deferred.reject('Invalid operation.');
        }
    }, function (err) {
        deferred.reject(err);
    });

    return deferred.promise;
};

Process.getRuntimeInfo = function (allProcesses) {
    var count,
        infos = [],
        now,
        i,
        proc,
        pid,
        mem,
        rawDate,
        startDate,
        procDetail,
        processes,
        procDetails,
        processWhere,
        detailWhere,
        deferred = Q.defer();
    try {
        count = allProcesses.length;
        processWhere = 'where "( ';
        for (i = 0; i < count; i = i + 1) {
            var currentProcess = allProcesses[i];
            currentProcess.r = [{status: 0}];
            processWhere += ' (name' + '=' + " '" + currentProcess.image + "'" + " AND " + 'ExecutablePath' + '=' + " '" + currentProcess.absPath.replace(/\\/g, '\\\\') + "') ";
            processWhere += i < count - 1 ? ' OR ' : '';
        }
        processWhere += ' )" ';
        psget('Win32_Process', processWhere, function (err, psinfo) {
            if (err) {
                //这种情况是： 无可用的实例 认为进程未运行...
                deferred.resolve();
                //deferred.resolve(err);
                return;
            }
            processes = psinfo;
            processes = processes.filter(function (v, i, arr) {
                return v.Name !== undefined;
            });
            count = processes.length;
            if (count > 0) {
                detailWhere = 'where "( ';
                for (i = 0; i < count; i = i + 1) {
                    detailWhere += ' (IDProcess' + '=' + " '" + processes[i].ProcessId + "') ";
                    detailWhere += i < count - 1 ? ' OR ' : '';
                }
                detailWhere += ' )" ';
                psdetailget('Win32_PerfFormattedData_PerfProc_Process', detailWhere, function (err, psdetailInfo) {
                    if (err) {
                        deferred.reject(err);
                        return;
                    }
                    procDetails = psdetailInfo;
                    now = Date.now();
                    for (i = 0; i < count; i = i + 1) {
                        infos = [];
                        proc = processes[i];
                        //proc.ExecutablePath = (new Iconv('GB2312', 'UTF-8')).convert(proc.ExecutablePath).toString();
                        pid = proc.ProcessId;
                        mem = proc.WorkingSetSize;
                        rawDate = proc.CreationDate; //20150810140302.571036+480
                        startDate = moment(rawDate.substring(0, rawDate.indexOf('.')), "YYYYMMDDHHmmss").toDate();
                        procDetail = procDetails.filter(function (v, i, arr) {
                            return v.IDProcess === pid;
                        })[0];
                        if (procDetail) {
                            infos.push(new ProcessInfo(
                                {
                                    pid: pid,
                                    status: 1,
                                    //restart: safeutf8(proc, 'ProcessId'),
                                    memory: Number(mem / 1024).toFixed(2),
                                    mempec: Number(100 * (mem / os.totalmem())).toFixed(2),
                                    uptime: now - startDate,
                                    cpupec: procDetail.PercentProcessorTime
                                }
                            ));
                            var matchRows = allProcesses.filter(function (v, i, arr) {
                                return v.image === proc.Name && v.absPath.toUpperCase() === proc.ExecutablePath.toUpperCase();
                            });
                            if (matchRows) {
                                matchRows.forEach(function (v) {
                                    v.r = infos;
                                });
                            } else {
                                logger.error("Fail to get process error, reason: %s", proc.ExecutablePath);
                            }
                        }
                    }
                    deferred.resolve();
                });
            } else {
                deferred.resolve();
            }
        });
    } catch (e) {
        logger.error("Get process error, reason: %s", e.stack);
        deferred.reject(e);
    }
    return deferred.promise;
};

Process.prototype.isRunning = function () {
    return this.r && this.r[0] && this.r[0].status === 1;
};

module.exports = Process;
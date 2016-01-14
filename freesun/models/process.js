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
var merge = require('lodash').merge;

var wmic = require('../tools/wmic');
var psget = wmic.path.get;
var psdetailget = wmic.path.get;

var logger = require('../env/logger');

function ProcessInfo(info) {
    this.spid = info.spid;
    this.pid = info.pid;
    this.status = info.status === undefined ? 0 : info.status;
    this.memory = info.memory === undefined ? 0 : info.memory;
    this.mempec = info.mempec === undefined ? 0 : info.mempec;
    this.uptime = info.uptime === undefined ? 0 : info.uptime;
    this.cpupec = info.cpupec === undefined ? 0 : info.cpupec;
    this.lastStatus = info.lastStatus === undefined ? -1 : info.lastStatus;
    this.startTime = info.startTime === undefined ? 0 : info.startTime;
    this.stopTime = info.stopTime === undefined ? 0 : info.stopTime;
    this.totalUpTime = info.totalUpTime === undefined ? 0 : info.totalUpTime;
    this.got = info.got === undefined ? false : info.got;
    this.startTimeChanged = info.startTimeChanged === undefined ? false : info.startTimeChanged;
}

function Process(process) {
    this.id = process.id;
    this.name = process.name;
    this.image = process.image;
    this.path = process.path;
    this.isWatching = process.watch !== undefined ? process.watch : true;
    this.logfile = process.logfile;
    this.project = process.project;
    //this.absPath = project.workspace.processDir + path + image
    this.absPath = process.absPath;
    //this.absDir = project.workspace.processDir + path
    this.absDir = process.absDir;
    this.stats = new ProcessInfo({});
}

Process.prototype.runtimeInfo = function () {
    return Process.getRuntimeInfo([this]);
};

Process.prototype.toggle = function (cmd, refresh) {
    var deferred = Q.defer(),
        promise,
        info,
        that = this;
    if (refresh) {
        promise = this.runtimeInfo();
    } else {
        promise = Q();
    }
    promise.then(function () {
        info = that.stats;
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
        stats,
        now,
        i,
        proc,
        pid,
        mem,
        rawDate,
        startTime,
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
            currentProcess.stats = new ProcessInfo({
                //reset
                status: 0,
                got: false,
                //keep
                lastStatus: currentProcess.stats.lastStatus,
                startTime: currentProcess.stats.startTime,
                totalUpTime: currentProcess.stats.totalUpTime,
                //stopTime = now // 两种情况，手工停止的，精确些；异常停止的误差５秒
                //stopTime: currentProcess.stats.stopTime === 0 ? Date.now() : currentProcess.stats.stopTime
                stopTime: Date.now()
            });
            //去掉SSS
            currentProcess.stats.stopTime = Math.floor(currentProcess.stats.stopTime / 1000) * 1000;
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
                        proc = processes[i];
                        //proc.ExecutablePath = (new Iconv('GB2312', 'UTF-8')).convert(proc.ExecutablePath).toString();
                        pid = proc.ProcessId;
                        mem = proc.WorkingSetSize;
                        rawDate = proc.CreationDate; //20150810140302.571036+480
                        startTime = moment(rawDate.substring(0, rawDate.indexOf('.')), "YYYYMMDDHHmmss").toDate() - 0;
                        procDetail = procDetails.filter(function (v, i, arr) {
                            return v.IDProcess === pid;
                        })[0];
                        if (procDetail) {
                            stats = {
                                pid: pid,
                                status: 1,
                                //restart: safeutf8(proc, 'ProcessId'),
                                memory: Number(mem / 1024).toFixed(2),
                                mempec: Number(100 * (mem / os.totalmem())).toFixed(2),
                                //去掉SSS
                                uptime: Math.floor(now / 1000) * 1000 - startTime,
                                cpupec: procDetail.PercentProcessorTime
                            };
                            //规避同一个路径下同一个进程启动多次的情况，这种情况下，无法与实际的进程匹配，处理上按照先后来，即 procDetail 找到一个 处理一个 标记一个
                            var matchRows = allProcesses.filter(function (v, i, arr) {
                                return v.image === proc.Name && v.absPath.toUpperCase() === proc.ExecutablePath.toUpperCase() && !v.stats.got;
                            });
                            if (matchRows) {
                                matchRows.some(function (v) {
                                    v.stats = merge(v.stats, stats);
                                    v.stats.got = true;
                                    v.stats.startTimeChanged = v.stats.startTime !== startTime;
                                    if (!v.stats.startTimeChanged) {
                                        v.stats.stopTime = 0; //
                                    } else {
                                        v.stats.stopTime = startTime - 1000; //认为刚停,空一秒,意思意思
                                    }
                                    v.stats.startTime = startTime; //
                                    return true;
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
    return this.stats && this.stats.status === 1;
};

module.exports = Process;
/**
 * Created by rain on 2015/8/25.
 */
/*jslint node:true */
/*jslint nomen:true */
/*jslint stupid:true */
'use strict';
var path = require('path');
var Q = require('q');
var fs = require('fs-extra');
var ustring = require('underscore.string');
var uuid = require('node-uuid');

var Process = require('./process');
var WebServer = require('./webserver');
var logger = require('../env/logger');
var config = require('../env/config');
var db = require('../db/database');
var wsconfig = require('../env/config').ws;

//Constants
var WATCH_SWITCH_KEY = 'watch_switch';

function Project(project) {
    this.name = project.name;
    this.version = {};
    this.updatable = project.updatable;
    this.process = [];
    this.webserver = [];
    this.isWatching = true;
    //this.id = 0;
}

Project.versionInfoFile = 'version.json';
//init value
Project.lastState = false;
Project.enableWatching = Project.lastState;
Project.loadSetting = function () {
    db.orm.Setting.findOne({where: {'name': WATCH_SWITCH_KEY}}).then(function (setting) {
        if (setting && setting.value) {
            Project.enableWatching = Project.lastState = setting.value === '1';
        }
    });
};
Project.loadSetting();

Project.projectDir = path.join(__dirname, '..\\projects');
Project.deletedDir = path.join(__dirname, '..\\projects\\deleted');

Project.prototype.addProcess = function (process) {
    this.process.push(process);
};

Project.prototype.addWebServer = function (web) {
    this.webserver.push(web);
};

Project.prototype.findProcess = function (id) {
    return this.process[id];
};

Project.prototype.findWeb = function (id) {
    return this.webserver[id];
};

Project.allProjects = undefined;
Project.lastState = config.project.watch;

Project.findById = function (pjid, config) {
    var all = Project.all(config),
        proj = null;
    try {
        proj = all[pjid];
    } catch (e) {
        logger.error('Fail to find project by id[%d], reason: %s.', pjid, e.stack);
    }
    return proj;
};

Project.deleteById = function (pjid, config) {
    var all = Project.all(config),
        result = false,
        now = new Date(),
        fileRename;
    try {
        delete all[pjid];
        fileRename = ustring.sprintf('%s.%s-%s-%s %s-%s-%s.js', pjid, now.getFullYear(), now.getMonth() + 1,
            now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
        fs.renameSync(path.join(Project.projectDir, pjid + '.js'), path.join(Project.deletedDir, fileRename));
        result = true;
    } catch (e) {
        logger.error('Fail to delete project by id[%d], reason: %s.', pjid, e.stack);
    }
    return result;
};

Project.findProcessById = function (pjid, pid, config) {
    var all = Project.all(config),
    //projs = all.filter(function (pj) {
    //    return pj.id === pjid;
    //}),
    //proj,
    //procs,
        proc = null;
    //if (projs.length > 0) {
    //    proj = projs[0];
    //    procs = proj.process.filter(function (pr) {
    //        return pr.id === pid;
    //    });
    //    if (projs.length > 0) {
    //        proc = procs[0];
    //    }
    //}
    try {
        proc = all[pjid].process[pid];
    } catch (e) {
        logger.error('Fail to find process by id[%d-%d], reason: %s.', pjid, pid, e.stack);
    }
    return proc;
};

Project.findWebServerById = function (pjid, pid, config) {
    var all = Project.all(config),
        site = null;
    try {
        site = all[pjid].webserver[pid];
    } catch (e) {
        logger.error('Fail to find web server by id[%d-%d], reason: %s.', pjid, pid, e.stack);
    }
    return site;
};

Project.loadConfig = function () {
    var loaded = [],
        projectFiles = fs.readdirSync(path.join(__dirname, '..\\projects'));
    if (Array.isArray(projectFiles)) {
        projectFiles.forEach(function (v, i) {
            if (path.extname(v) === '.js') {
                try {
                    var proj = require(path.join(__dirname, '..\\projects', v)).project;
                    proj.id = path.basename(v, '.js');
                    loaded.push(proj);
                } catch (e) {
                    logger.error('Fail to load project form %s. reason: %s', v, e.stack);
                }
            }
        });
    }
    return loaded;
};

Project.makeProject = function (option, id, verDir) {
    var pj = new Project(option);
    pj.id = id;
    Object.defineProperty(pj, "workspace", {
        value: option.workspace,
        writable: true,
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(pj, "sqlCmd", {
        value: option.sqlCmd,
        writable: true,
        enumerable: false,
        configurable: true
    });
    if (Array.isArray(option.process)) {
        option.process.forEach(function (pv, j) {
            var proc = new Process(pv);
            proc.id = j;
            Object.defineProperty(proc, "project", {
                value: pj,
                writable: true,
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(proc, "absDir", {
                value: option.workspace.rootDir ? path.join(option.workspace.rootDir, option.workspace.processDir, proc.path) : path.join(option.workspace.processDir, proc.path),
                writable: true,
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(proc, "absPath", {
                value: path.join(proc.absDir, proc.image),
                writable: true,
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(proc, "config", {
                value: pv.config,
                writable: true,
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(proc, "copy", {
                value: pv.copy,
                writable: true,
                enumerable: false,
                configurable: true
            });
            if (proc.logfile) {
                proc.logfile = path.join(proc.absDir, proc.logfile);
            }
            if (proc.logfile) {
                proc.logfile = path.join(proc.absDir, proc.logfile);
            }
            pj.addProcess(proc);
        });
    }
    if (Array.isArray(option.webserver)) {
        option.webserver.forEach(function (w, j) {
            var web = new WebServer(w);
            web.id = j;
            Object.defineProperty(web, "project", {
                value: pj,
                writable: true,
                enumerable: false,
                configurable: true
            });
            //web.absPath = path.join(v.workspace.processDir, web.path);
            Object.defineProperty(web, "absPath", {
                value: option.workspace.rootDir ? path.join(option.workspace.rootDir, option.workspace.webDir, web.path) : path.join(option.workspace.webDir, web.path),
                writable: true,
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(web, "absDir", {
                value: web.absPath,
                writable: true,
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(web, "config", {
                value: w.config,
                writable: true,
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(web, "copy", {
                value: w.copy,
                writable: true,
                enumerable: false,
                configurable: true
            });
            pj.addWebServer(web);
        });
    }
    try {
        if (verDir === undefined) {
            verDir = option.workspace.rootDir;
        }
        if (verDir) {
            var verFile = path.join(verDir, Project.versionInfoFile);
            pj.version = JSON.parse(fs.readFileSync(verFile));
        }
    } catch (err) {
        pj.version = {};
        logger.error(`Can not read version info: ${err.stack}`);
    }
    return pj;
};

Project.currentMaxId = 0;
/**
 * get a usable id;
 * @param config
 * @returns {string}
 */
Project.getId = function (config) {
    Project.currentMaxId++;
    return Project.currentMaxId;
};

Project.all = function (config) {
    if (Project.allProjects) {
        return Project.allProjects;
    }
    var projects = config || Project.loadConfig(),
        all = [],
        pj,
        id;
    if (Array.isArray(projects)) {
        projects.forEach(function (v, i) {
            if (v.id) {
                id = v.id.toString();
                pj = Project.makeProject(v, id);
                all[id] = pj;
            }
        });
        Project.allProjects = all;
    }
    return Project.allProjects;
};

Project.firstTime = true;

Project.allWithRuntimeInfo = function (config, force) {
    var allProject = Project.all(config),
        promise = Q(),
        defered = Q.defer();
    if (Project.firstTime) {
        promise = Project.loadHistoryInfo(allProject);
        Project.firstTime = false;
    }
    promise.then(function () {
        Project.patrolProjects(allProject, force, true).then(function (projs) {
            setTimeout(function () {
                Project.refreshHistory(projs);
            }, 0);
            defered.resolve(projs);
        }, function (err) {
            defered.reject(err);
        });// start
    });
    return defered.promise;
};

Project.refreshHistory = function (projs) {
    projs.forEach(function (pj) {
        pj.process.forEach(function (ps) {
            var condition = {
                path: ps.absDir,
                image: ps.image,
                projectid: ps.project.id,
                stop: null
            };
            if (ps.stats.lastStatus !== ps.stats.status) { // changed
                if (ps.stats.status === 0) { // stop
                    var promise = Q();
                    if (ps.stats.lastStatus === -1) {//第一次运行，需要判断进程在数据库中是否已经是启动状态
                        promise = db.orm.ProcessHistory.findOne({where: condition});
                    }
                    promise.then(function (history) {
                        if (ps.stats.lastStatus === -1) {
                            if (history) {//第一次从数据库里获取的时间 不精确
                                ps.stats.totalUpTime += ps.stats.stopTime - history.start;
                            }
                        } else {//运行时获取的起止时间，保护下
                            ps.stats.totalUpTime += ps.stats.startTime !== 0 ? ps.stats.stopTime - ps.stats.startTime : 0;
                        }
                        //不管怎样，刷新
                        ps.stats.startTime = 0;
                        Project.updateHistory(ps, condition).then(function () {
                            //nothing
                        });
                    });
                } else { //start
                    db.orm.ProcessHistory.findOne({where: {start: ps.stats.startTime}}).then(function (history) {
                        if (!history) {
                            Project.createHistory(ps).then(function () {
                                //nothing
                            });
                        }
                    });
                }
                ps.stats.lastStatus = ps.stats.status;
            } else {
                if (ps.stats.startTimeChanged && ps.stats.status === 1) { // 一个周期内启动了多次:依赖低粒度监测,认为一个周期只变化了一次
                    Project.updateHistory(ps, condition).then(function () {
                        Project.createHistory(ps).then(function () {
                            //nothing
                        });
                    });
                }
            }
        });
    });
};

Project.updateHistory = function (ps, condition) {
    var defered = Q.defer();
    db.orm.ProcessHistory.update(
        {stop: ps.stats.stopTime},
        {where: condition}
    ).then(function () {
        logger.info("Update a process stop history:", ps);
        defered.resolve();
    }).catch(function (err) {
        logger.info("Fail to record a process history:", ps, err);
        defered.reject(err);
    });
    return defered.promise;
};

Project.createHistory = function (ps) {
    var defered = Q.defer();
    if (ps.stats.startTime === 0) {
        //protect
        var msg = ustring.sprintf("%s %s", "Invalid start time:", JSON.stringify(ps));
        logger.error(msg);
        defered.reject(msg);
    } else {
        var record = {
            name: ps.name,
            path: ps.absDir,
            image: ps.image,
            projectid: ps.project.id,
            stop: null,
            start: ps.stats.startTime
        };
        db.orm.ProcessHistory.create(record).then(function () {
            logger.info("Record a process start history:", ps);
            defered.resolve();
        }).catch(function (err) {
            logger.info("Fail to record a start history:", ps, err);
            defered.reject(err);
        });
    }
    return defered.promise;
};

Project.loadHistoryInfo = function (projects) {
    var deferred = Q.defer(),
        allWebServers = [],
        allProcesses = [];
    projects.forEach(function (pj) {
        allProcesses = allProcesses.concat(pj.process);
        allWebServers = allWebServers.concat(pj.webserver);
    });
    db.orm.ProcessHistory.findAll({
        where: {
            stop: {
                ne: null
            }
        }
    }).then(function (historys) {
        allProcesses.forEach(function (j) {
            j.stats.totalUpTime = historys.filter(function (k) {
                return j.project.id == k.projectid
                    && j.absPath === path.join(k.path, k.image)
                    && j.name === k.name;
            }).reduce(function (previousValue, l) {
                return previousValue + (l.stop - l.start);
            }, 0);
        });
        deferred.resolve();
    }, function (err) {
        deferred.resolve();
        logger.error(`Failed to load history info of process. ${err.stack}`);
    });
    return deferred.promise;
};

Project.patrolProjects = function (projects, force, startOrStop) {
    var deferred = Q.defer(),
        allWebServers = [],
        allProcesses = [],
        oper = startOrStop ? 1 : 0;
    projects.forEach(function (pj) {
        allProcesses = allProcesses.concat(pj.process);
        allWebServers = allWebServers.concat(pj.webserver);
    });
    Process.getRuntimeInfo(allProcesses)
        .then(function () {
            return allWebServers.reduce(function (prev, next) {
                return next.refresh();
            }, Q());
        }).then(function () {
            if (Project.isWatching() || force) {
                return allProcesses.reduce(function (prev, next) {
                    if (!force && (!next.project.isWatching || !next.isWatching || next.isRunning())) {
                        return Q();
                    }
                    //ignore, multi project with same path, multi process will be started.
                    return next.toggle(oper, false);
                }, allWebServers.reduce(function (prev, next) {
                    if (!force && (!next.project.isWatching || !next.isWatching || next.isRunning())) {
                        return Q();
                    }
                    return next.toggle(oper, false);
                }, Q()));
            }
            return Q();
        })
        .then(function () {
            deferred.resolve(projects);
        }, function (err) {
            deferred.reject(err);
        });
    return deferred.promise;
};

Project.addProject = function (proj) {
    Project.all()[proj.id] = proj;
};

Project.stopWatching = function () {
    Project.enableWatching = false;
    Project.lastState = false;
};

Project.startWatching = function () {
    Project.enableWatching = true;
    Project.lastState = true;
};

Project.watchSwitch = function () {
    Project.enableWatching = !Project.enableWatching;
    Project.lastState = Project.enableWatching;
    //Persistence
    db.orm.Setting.update({'value': Project.enableWatching ? '1' : '0'}, {where: {'name': WATCH_SWITCH_KEY}});
};

Project.pauseWatching = function () {
    Project.enableWatching = false;
};

Project.resumeWatching = function () {
    Project.enableWatching = Project.lastState;
};

Project.isWatching = function () {
    return Project.enableWatching && config.project.watch;
};

Project.isWatchEnable = function () {
    return config.project.watch;
};

// will not check the status of update service. caller should check it self.
// all these function will only available when auto monitor switch is off.
Project.startAll = function () {
    var deferred = Q.defer();
    if (Project.isWatching()) {
        deferred.reject("Watch switch is enabled. System will monitor the status automatically.");
    } else {
        return Project.allWithRuntimeInfo(undefined, true);
    }
    return deferred.promise;
};

Project.start = function (id) {
    var deferred = Q.defer();
    if (Project.isWatching()) {
        deferred.reject("Watch switch is enabled. System will monitor the status automatically.");
    } else {
        var project = Project.findById(id);
        if (project) {
            return Project.patrolProjects([project], true, true); //start
        }
        deferred.reject("Project does not exist.");
    }
    return deferred.promise;
};

Project.stopAll = function () {
    var deferred = Q.defer();
    if (Project.isWatching()) {
        deferred.reject("Watch switch is enabled. System will monitor the status automatically.");
    } else {
        var allProject = Project.all(config);
        return Project.patrolProjects(allProject, true, false); // stop
    }
    return deferred.promise;
};

Project.stop = function (id, force) {
    var deferred = Q.defer();
    if (Project.isWatching() && !force) {
        deferred.reject("Watch switch is enabled. System will monitor the status automatically.");
    } else {
        var project = Project.findById(id);
        if (project) {
            return Project.patrolProjects([project], true, false); //stop
        }
        deferred.reject("Project does not exist.");
    }
    return deferred.promise;
};

Project.currentMaxId = 0;
Project.init = function () {
    var allProjectFiles,
        projectFiles = fs.readdirSync(path.join(__dirname, '..\\projects')),
        deletedProjectFiles = fs.readdirSync(path.join(__dirname, '..\\projects\\deleted'));
    allProjectFiles = projectFiles.concat(deletedProjectFiles);
    allProjectFiles.forEach(function (v, i) {
        if (path.extname(v) === '.js') {
            var id = Number(v.substring(0, v.indexOf('.')));
            if (!Number.isNaN(id)) {
                Project.currentMaxId = Math.max(Project.currentMaxId, id);
            }
        }
    });
    Project.resumeWatching();
};

module.exports = Project;
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

function Project(project) {
    this.name = project.name;
    this.updatable = project.updatable;
    this.process = [];
    this.webserver = [];
    //this.id = 0;
}

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
Project.enableWatching = config.project.watch;
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

Project.makeProject = function (option, id) {
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
                value: path.join(option.workspace.processDir, proc.path),
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
                value: path.join(option.workspace.webDir, web.path),
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
    return pj;
};

Project.getId = function (config) {
    var arr = Project.all(config),
        id = 0;
    while (arr[id.toString()]) {
        id = id + 1;
    }
    return id.toString();
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
            } else {
                id = Project.getId().toString();
            }
            pj = Project.makeProject(v, id);
            all[id] = pj;
        });
        Project.allProjects = all;
    }
    return Project.allProjects;
};

Project.allWithRuntimeInfo = function (config) {
    var allProject = Project.all(config),
        deferred = Q.defer(),
        allWebServers = [],
        allProcesses = [];
    allProject.forEach(function (pj) {
        allProcesses = allProcesses.concat(pj.process);
        allWebServers = allWebServers.concat(pj.webserver);
    });
    Process.getRuntimeInfo(allProcesses)
        .then(function () {
            return allWebServers.reduce(function (prev, next) {
                return next.refresh();
            }, Q());
        }).then(function () {
            if (Project.watch()) {
                return allProcesses.reduce(function (prev, next) {
                    if (!next.watch || next.isRunning()) {
                        return Q();
                    }
                    //ignore, multi project with same path, multi process will be started.
                    return next.toggle(1, false);
                }, allWebServers.reduce(function (prev, next) {
                    if (!next.watch || next.isRunning()) {
                        return Q();
                    }
                    return next.toggle(1, false);
                }, Q()));
            }
            return Q();
        })
        .then(function () {
            deferred.resolve(allProject);
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
};

Project.pauseWatching = function () {
    Project.enableWatching = false;
};

Project.resumeWatching = function () {
    Project.enableWatching = Project.lastState;
};

Project.watch = function () {
    return Project.enableWatching && config.project.watch;
};

module.exports = Project;
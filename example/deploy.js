/*jslint node:true */
/*
* Example project
*/

"use strict";
var fs = require('fs-extra');
var Q = require('q');
var path = require('path');
var ustring = require('underscore.string');

var DB = require('../upgrade/database');
var PS = require('../upgrade/process');
var WEB = require('../upgrade/webserver');
var CP = require('../upgrade/copyutil');

var database = {
    server: '192.168.0.10',
    database: 'ABC',
    username: 'xxx',
    password: '123',
    init: function () {
        this.connStr =
            ustring.sprintf("server=%s;database=%s;uid=%s;pwd=%s",
                this.server,
                this.database,
                this.username,
                this.password);
        return this;
    }
}.init();

var workspace = {
    updatePkg: '',
    processDir: 'D:\\deploy\\process',
    webDir: 'D:\\deploy\\web',
    keepOldBackup: true,
    database: database
};

var sqlCmd = {
    keepOldBackup: true,
    //这个是目标机器的目录，必须指定完整路径
    backupDBFile: 'D:\\deploy\\db\\db.bak',
    loginTemplate: {
        server: {
            name: database.server,
            protocol: 'tcp',
            instance: '',
            port: 1433
        },
        database: database.database,
        username: database.username,
        password: database.password,
        trustedConnection: false,
        dedicatedAdminConnection: false,
        trustServerCert: true,
        loginTimeout: 30,
        //workstationName: '',
        //applicationIntent: 'ReadOnly',
        multisubnetFailover: false,
        encryptedConnection: false
        // Change a password. (-Z)
        //newPassword: 'p@$$w0rd'
    },
    ioTemplate: {
        inputFiles: [],
        outputFile: '',
        codepage: {
            input: '65001',
            output: '936'
        },
        errorRedirection: {
            all: true
        },
        localizeResults: true,
        unicodeOutput: false
    },
    errorTemplate: {
        failOnSqlErrors: true,
        errorLevel: -1,
        errorSeverityLevel: 1
    },
    queryTemplate: {
        query: '',
        variables: {},
        queryTimeout: 1800,
        printInputScripts: true,
        quoteIdentifier: true,
        ignoreVariables: true
    }
};

var aproject = {
    name: 'A example project.',
    updatable: true,
    workspace: workspace,
    sqlCmd: sqlCmd,
    webserver: [{
        name: 'A Web',
        protocol: 'http',
        port: 8008,
        host: '*',
        path: 'AWeb',
        pool: 'AWeb',
        config: []
    }],
    process: [{
        name: "A Process",
        image: "aprocess.exe",
        path: "Server\\AProcess",
        config: [],
        copy: []
    }]
};

function DeployFlow(proj, service) {
    this.project = proj;
    this.service = service;
}

var install = function (uf) {
    return PS.stop(uf)
        .then(function (uf) {
            return WEB.stop(uf);
        }).then(function (uf) {
            return WEB.deletee(uf);
        }).then(function (uf) {
            return WEB.create(uf);
        }).then(function (uf) {
            return WEB.mapAppPool(uf);
        }).then(function (uf) {
            return CP.deployWeb(uf);
        }).then(function (uf) {
            return CP.setupWeb(uf);
        }).then(function (uf) {
            return CP.deployProcess(uf);
        }).then(function (uf) {
            return CP.setupProcess(uf);
        }).then(function (uf) {
            return WEB.start(uf);
        }).then(function (uf) {
            return PS.start(uf);
        });
};
DeployFlow.prototype.install = install;

var uninstall = function (uf) {
    return Q();
};
DeployFlow.prototype.uninstall = uninstall;

var update = function (uf) {
    var oldFlow = uf.oldFlow;
    var newFlow = uf.newFlow;
    return PS.stop(oldFlow)
        .then(function () {
            return WEB.stop(oldFlow);
        }).then(function () {
            return CP.backupProcess(oldFlow);
        }).then(function () {
            return CP.backupWebServer(oldFlow);
        }).then(function () {
            return WEB.deletee(oldFlow);
        }).then(function () {
            return DB.executeSqls(newFlow);
        }).then(function () {
            return WEB.create(newFlow);
        }).then(function () {
            return WEB.mapAppPool(newFlow);
        }).then(function () {
            return CP.deployWeb(newFlow);
        }).then(function () {
            return CP.setupWeb(newFlow);
        }).then(function () {
            return CP.migrateWeb(newFlow);
        }).then(function () {
            return CP.deployProcess(newFlow);
        }).then(function () {
            return CP.setupProcess(newFlow);
        }).then(function () {
            return CP.migrateProcess(newFlow);
        }).then(function () {
            return WEB.start(newFlow);
        }).then(function () {
            return PS.start(newFlow);
        });
};
DeployFlow.prototype.update = update;

var rollback = function (uf) {
    var oldFlow = uf.oldFlow;
    var newFlow = uf.newFlow;
    return Q().then(function () {
        return DB.restore(oldFlow);
    }).then(function () {
        return CP.restoreWeb(oldFlow);
    }).then(function () {
        return CP.restoreProcess(oldFlow);
    }).then(function () {
        return WEB.deletee(oldFlow);
    }).then(function () {
        return WEB.create(oldFlow);
    }).then(function () {
        return WEB.mapAppPool(oldFlow);
    }).then(function () {
        return WEB.start(oldFlow);
    }).then(function () {
        return PS.start(oldFlow);
    });
};
DeployFlow.prototype.rollback = rollback;

module.exports = {
    Flow: DeployFlow,
    project: aproject
};

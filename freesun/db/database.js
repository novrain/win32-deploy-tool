/**
 * Created by rain on 2016/1/7.
 */
/*jslint node:true */
'use strict';
var fs = require('fs-extra');
var path = require('path');
var Sequelize = require('sequelize');
var config = require('../env/config');
var globalOrm = new Sequelize(config.database.url, config.database.opts);

function defineSetting(orm) {
    orm.Setting = orm.define('setting', {
        name: {
            type: Sequelize.STRING,
            field: 'name'
        },
        value: {
            type: Sequelize.STRING,
            field: 'value'
        }
    }, {
        tableName: 'setting'
    });
}

function defineUser(orm) {
    orm.User = orm.define('user', {
        username: {
            type: Sequelize.STRING,
            field: 'username'
        },
        password: {
            type: Sequelize.STRING,
            field: 'password'
        }
    }, {
        tableName: 'user'
    });
}

function defineSelfUpdateHistory(orm) {
    orm.SelfUpdateHistory = orm.define('selfupdatehistory', {
        revision: {
            type: Sequelize.STRING,
            field: 'revision'
        },
        when: {
            type: Sequelize.STRING,
            field: 'when'
        },
        result: {
            type: Sequelize.INTEGER,
            field: 'result'
        },
        buildtime: {
            type: Sequelize.STRING,
            field: 'buildtime'
        },
        reason: {
            type: Sequelize.INTEGER,
            field: 'reason'
        }
    }, {
        tableName: 'selfupdatehistory'
    });
}

function defineProjcetHistory(orm) {
    orm.ProjectHistory = orm.define('projecthistory', {
        projectid: {
            type: Sequelize.INTEGER,
            field: 'projectid'
        },
        name: {
            type: Sequelize.STRING,
            field: 'name'
        },
        revision: {
            type: Sequelize.STRING,
            field: 'revision'
        },
        buildtime: {
            type: Sequelize.STRING,
            field: 'buildtime'
        },
        operation: {
            type: Sequelize.INTEGER,
            field: 'operation'
        },
        when: {
            type: Sequelize.STRING,
            field: 'when'
        },
        result: {
            type: Sequelize.INTEGER,
            field: 'result'
        },
        reason: {
            type: Sequelize.STRING,
            field: 'reason'
        }
    }, {
        tableName: 'projecthistory'
    });
}

function defineProcessHistory(orm) {
    orm.ProcessHistory = orm.define('processhistory', {
        projectid: {
            type: Sequelize.INTEGER,
            field: 'projectid'
        },
        name: {
            type: Sequelize.STRING,
            field: 'name'
        },
        path: {
            type: Sequelize.STRING,
            field: 'path'
        },
        image: {
            type: Sequelize.STRING,
            field: 'image'
        },
        start: {
            type: Sequelize.INTEGER,
            field: 'start'
        },
        stop: {
            type: Sequelize.INTEGER,
            field: 'stop'
        }
    }, {
        tableName: 'processhistory'
    });
}

/*IIS runtime @Todo*/
function defineWebHistory(orm) {
    orm.WebHistory = orm.define('webhistory', {
        start: {
            type: Sequelize.INTEGER,
            field: 'start'
        },
        stop: {
            type: Sequelize.INTEGER,
            field: 'stop'
        }
    }, {
        tableName: 'webhistory'
    });
}

function use(app) {
    defineSetting(globalOrm);
    defineUser(globalOrm);
    defineSelfUpdateHistory(globalOrm);
    defineProjcetHistory(globalOrm);
    defineProcessHistory(globalOrm);
    defineWebHistory(globalOrm);
    app.orm = globalOrm;

    return function (req, res, next) {
        req.orm = globalOrm;
        next();
    };
}

module.exports = {
    entry: use,
    orm: globalOrm
};

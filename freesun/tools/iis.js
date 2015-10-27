/**
 *  Copyright (C) 2012 Integrify, Inc. -- copy from node-iis https://github.com/Integrify/node-iis
 *
 */
/*jslint node:true */
'use strict';

var exec = require('child_process').exec;
var path = require('path');
var xml2js = require('xml2js');
var _ = require('underscore');

var IIS = function () {
    return {
        execute: function (cmd, cb) {
            if (!_.isFunction(cb)) {
                cb = _.noop;
            }
            if (!_.isString(cmd)) {
                cb(new TypeError('args must be a string'));
            }

            exec(cmd, function (errIn, stdOut, stdErr) {
                var err = errIn || stdErr.trim();

                cb(err ? new Error(err + cmd) : null, stdOut.trim());
            });
        },
        setDefaults: function (options) {
            var appdrive = options.drive || 'c';
            this.sitekey = options.sitekey || '$';
            this.appcmd = appdrive + ':\\windows\\system32\\inetsrv\\appcmd.exe';

        },
        createSite: function (options, cb) {
            var self = this;
            options = options ||
            {
                name: 'New Site',
                protocol: 'http',
                host: '*',
                port: '80'
            };

            //hold this to be used when creating app folders, etc
            self.last_site = options.name;

            self.exists('site', options.name, function (err, tf) {
                if (!tf) {

                    var site_cmd = ' add site /name:"' + options.name + '"';
                    site_cmd += ' /bindings:' + (options.bindings || (options.protocol + '://' + options.host + ':' + options.port));

                    if (options.absPath) {
                        site_cmd += ' /physicalPath:"' + options.absPath + '"';
                    }

                    self.execute(self.appcmd + ' ' + site_cmd, cb);
                }
                else {
                    cb('Site ' + options.name + ' exists');
                }
            });

        },
        deleteSite: function (options, cb) {
            var self = this;
            self.exists('site', options.name, function (err, tf) {
                if (tf) {
                    self.execute(self.appcmd + ' delete site /site.name:"' + options.name + '"', cb);
                } else {
                    // Ignore
                    cb(null, 'Site ' + options.name + ' does not exists');
                }
            });
        },
        stopSite: function (options, cb) {
            var self = this;
            self.exists('site', options.name, function (err, tf) {
                if (tf) {
                    self.execute(self.appcmd + ' stop site /site.name:"' + options.name + '"', function (err) {
                        if (err) {
                            cb(err);
                        } else {
                            self.stopAppPool(options, cb);
                        }
                    });
                } else {
                    // Ignore
                    cb(null, 'Site ' + options.name + ' does not exists');
                }
            });
        },
        startSite: function (options, cb) {
            var self = this;
            self.exists('site', options.name, function (err, tf) {
                if (tf) {
                    self.execute(self.appcmd + ' start site /site.name:"' + options.name + '"', function (err) {
                        if (err) {
                            cb(err);
                        } else {
                            self.startAppPool(options, cb);
                        }
                    });
                } else {
                    cb('Site ' + options.name + ' does not exists');
                }
            });
        },
        /**
         /**
         * Create app pool, also set app pool identity of object {name:,identity:} passed
         * @param options
         * @param cb
         */
        createAppPool: function (options, cb) {
            var self = this;
            var poolname = typeof(options) == 'string' ? options : options.name;
            var identity = typeof(options) == 'string' ? null : options.identity;
            self.exists('apppool', poolname, function (err, tf) {
                if (!tf) {
                    self.execute(self.appcmd + ' add apppool /name:"' + poolname + '"', function (err, stdout) {
                        if (!err && identity) {
                            self.setAppPoolIdentity(poolname, identity, cb);
                        }
                        else {
                            cb(err, stdout);
                        }
                    });
                }
                else {
                    cb(null, 'App pool ' + poolname + ' exists');
                }
            })
        },
        recycleAppPool: function (options, cb) {
            this.execute(this.appcmd + ' recycle apppool /apppool.name:"' + options.pool + '"', cb);
        },
        deleteAppPool: function (options, cb) {
            var self = this;
            self.exists('apppool', options.pool, function (err, tf) {
                if (tf) {
                    self.execute(self.appcmd + ' delete apppool /apppool.name:"' + options.pool + '"', cb);
                } else {
                    cb(null, 'App Pool ' + options.pool + ' does not exists');
                }
            });
        },
        stopAppPool: function (options, cb) {
            var self = this;
            self.exists('apppool', options.pool, function (err, tf) {
                if (tf && tf.state !== 'Stopped') {
                    self.execute(self.appcmd + ' stop apppool /apppool.name:"' + options.pool + '"', cb);
                } else {
                    cb(null, 'App Pool ' + options.pool + ' does not exists or stopped');
                }
            });
        },
        startAppPool: function (options, cb) {
            var self = this;
            self.exists('apppool', options.pool, function (err, tf) {
                if (tf) {
                    self.execute(self.appcmd + ' start apppool /apppool.name:"' + options.pool + '"', cb);
                } else {
                    cb(null, 'App Pool ' + options.pool + ' does not exists');
                }
            });
        },
        mapAppPool: function (options, cb) {
            var map_cmd = ' set app /app.name:"' + options.name + '/" /applicationPool:' + options.pool;
            this.execute(this.appcmd + ' ' + map_cmd, cb);
        },
        setAppPoolIdentity: function (pool_name, identity, cb) {
            var set_cmd = " set config /section:applicationPools /[name='" + pool_name + "'].processModel.identityType:" + identity;
            this.execute(this.appcmd + ' ' + set_cmd, cb);
        },
        createAppFolder: function (options, cb) {
            var self = this;
            self.exists('app', (options.site || this.last_site) + '/' + options.virtual_path, function (err, tf) {
                if (!tf) {
                    var createapp_cmd = ' add app /site.name:"' + (options.site || self.last_site) + '" /path:/' + options.virtual_path + ' /physicalPath:"' + options.physical_path + '"';
                    self.execute(self.appcmd + createapp_cmd, cb);
                }
                else {
                    cb(err, "App " + (options.site || self.last_site) + '/' + options.virtual_path + " already exists");
                }
            });

        },
        unlockSection: function (section, cb) {
            var unlock_cmd = " unlock config /section:" + section;
            this.execute(this.appcmd + unlock_cmd, cb);
        },
        setWindowsAuthentication: function (appPath, enable, cb) {
            var self = this;
            var set_cmd = ' set config "' + appPath + '" /section:windowsAuthentication /enabled:' + enable;
            self.unlockSection('windowsAuthentication', function (err, stdout) {
                self.execute(self.appcmd + set_cmd, cb);
            });

        },
        setAnonymousAuthentication: function (appPath, enable, cb) {
            var self = this;
            var set_cmd = ' set config "' + appPath + '" /section:anonymousAuthentication /enabled:' + enable;
            self.unlockSection('anonymousAuthentication', function (err, stdout) {
                self.execute(self.appcmd + set_cmd, cb);
            });

        },
        list: function (type, cb) {
            var parser = new xml2js.Parser();
            var self = this;
            self.execute(this.appcmd + ' list ' + type + ' /xml', function (err, outxml) {
                parser.parseString(outxml, function (err, result) {
                    result = result['appcmd'];
                    //
                    //  may return a single object if only 1 site exists
                    //
                    var mapped = [];
                    if (_.isArray(result[type.toUpperCase()])) {
                        mapped = _.map(result[type.toUpperCase()], function (v) {
                            return v[self.sitekey];
                        });
                    } else if (result[type.toUpperCase()]) {
                        mapped = [result[type.toUpperCase()][self.sitekey]];
                    } else {
                        mapped = [];
                    }

                    if (cb) {
                        cb(err, mapped);
                    }
                    else {
                        console.log(mapped);

                    }

                });

            });

        },
        exists: function (type, name, cb) {
            var self = this;
            this.list(type, function (err, res) {

                var match = null;

                if (!err) {
                    match = _.find(res, function (v) {
                        var m = v[type.toUpperCase() + '.NAME'];
                        return m && m.toLowerCase() === name.toLowerCase();
                    });
                }

                if (cb) {
                    cb(err, match);
                }
                else {
                    console.log(match);
                }

            });
        },
        getInfo: function (type, name, cb) {
            this.list(type, function (err, res) {
                var info = null;
                if (!err) {
                    info = res.filter(function (v) {
                        var m = v[type.toUpperCase() + '.NAME'];
                        return m && m.toLowerCase() === name.toLowerCase();
                    });
                }

                if (cb) {
                    cb(err, info.length > 0 ? info[0] : null);
                }
                else {
                    console.log(info);
                }
            });
        },
        setFilePermissions: function (path, account, cb) {
            this.execute('icacls "' + path + '*" /grant ' + account + ':(OI)(CI)F', function (err, stdout) {
                if (cb) {
                    cb(err, stdout);
                }
                else {
                    console.log(err, stdout);
                }
            });
        },
        /**
         * Set the physical path web site maps to
         * @param site_name
         */
        setPhysicalPath: function (site_name, path, cb) {
            this.execute(this.appcmd + ' set vdir "' + site_name + '/" -physicalPath:"' + path + '"', cb);
        },
        /**
         * Get the physical path web site maps to
         * @param site_name
         */
        getPhysicalPath: function (site_name, cb) {
            var self = this;
            this.list("VDIR", function (err, res) {

                var match = null;

                if (!err) {
                    match = _.find(res, function (v) {
                        var m = v['VDIR.NAME'];
                        return m && m.toLowerCase() === (site_name.toLowerCase() + '/');
                    });
                }

                if (cb) {
                    cb(err, match ? match["physicalPath"] : null);
                }
                else {
                    console.log(match ? match["physicalPath"] : null);
                }
            });
        }
    };
}();

IIS.setDefaults({});

module.exports = IIS;
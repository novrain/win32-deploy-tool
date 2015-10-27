/**
 * Created by rain on 2015/8/6.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var Auth = {};
var Q = require('q');

Auth.isAuthenticated = function (req, res) {
    var deferred = Q.defer();

    if (req.isAuthenticated()) {
        deferred.resolve();
    } else {
        res.statusCode = 401;
        res.end('Unauthenticated');
    }

    return deferred.promise;
};

module.exports = Auth;
/**
 * Created by rain on 2015/8/6.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var login = require('./login');
var User = require('../models/user');

module.exports = function (passport) {

    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    login(passport);
};
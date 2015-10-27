/**
 * Created by rain on 2015/8/6.
 */
/*jslint node:true */
/*jslint nomen:true */
/*jslint stupid:true */
'use strict';
var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var bcrypt = require('bcrypt-nodejs');

module.exports = function (passport) {
    var isValidPassword = function (user, password) {
        return bcrypt.compareSync(password, user.password);
    };

    passport.use('login', new LocalStrategy({
        passReqToCallback: true
    }, function (req, username, password, done) {
        User.find(username, function (err, user) {
            if (err) {
                return done(err);
            }
            if (!user) {
                return done(null, false, req.flash('message', req.__('无效的用户名或密码.')));
            }
            if (!isValidPassword(user, password)) {
                return done(null, false, req.flash('message', req.__('无效的用户名或密码.')));
            }
            return done(null, user);
        });
    }));
};
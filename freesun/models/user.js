/**
 * Created by rain on 2015/8/5.
 */
/*jslint node:true */
/*jslint nomen:true */
/*jslint stupid:true */
'use strict';
var bcrypt = require('bcrypt-nodejs');
var Users = [{
    id: 0,
    username: "admin",
    password: bcrypt.hashSync('axNurse')
}];

function User(user) {
    this.id = user.id;
    this.username = user.username;
    this.password = user.password;
}

User.find = function (username, callback) {
    var found = Users.filter(function (v) {
        return v.username === username;
    });
    if (found) {
        callback(null, found[0]);
    } else {
        callback("User does not exist.");
    }
};

User.findById = function (id, callback) {
    var found = Users.filter(function (v) {
        return v.id === id;
    });
    if (found) {
        callback(null, found[0]);
    } else {
        callback("User does not exist.");
    }
};

module.exports = User;
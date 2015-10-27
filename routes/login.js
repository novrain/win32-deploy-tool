/**
 * Created by rain on 2015/8/5.
 */
/*jslint node:true */
/*jslint nomen:true */
'use strict';
var passport = require('passport');
var express = require('express');
var router = express.Router();

/**
 * base route /login
 */
router.get('/', function (req, res, next) {
    res.render('login');
});

router.post('/', passport.authenticate('login', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

module.exports = router;
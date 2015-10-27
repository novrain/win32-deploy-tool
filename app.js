/*jslint node:true */
/*jslint nomen:true */
'use strict';
// form npm
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var session = require('express-session');
var i18n = require("i18n");
var flash = require("connect-flash");

// from freesun
// process service
var ps = require('./freesun/services/processservice');
// system service
var ss = require('./freesun/services/systemservice');
// tail service
var ts = require('./freesun/services/tailfileservice');
// tail service
var us = require('./freesun/services/updateservice');
// config
var config = require('./freesun/env/config');
// routes
var home = require('./routes/index');
var login = require('./routes/login');
var proj = require('./routes/project');
var proc = require('./routes/process');
var webr = require('./routes/webserver');
var upld = require('./routes/upload');
var upgrade = require('./routes/upgrade');

var app = express();

i18n.configure({
    locales: ['zh_CN', 'en'],
    directory: __dirname + '/locales'
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.engine('html', require('jade').__express);

app.use(favicon(path.join(__dirname, 'static', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'static')));
app.use(session({
    secret: 'axNurse',
    resave: true,
    saveUninitialized: true
}));
app.use(i18n.init);


if (config.auth.enable) {
    app.use(passport.initialize());
    app.use(passport.session());
    app.use(flash());

    var initPassport = require('./freesun/passport/init');
    initPassport(passport);
}
// start service
ps.start();
ss.start();
ts.start();
us.start();
//put it
app.set('fs.update.service', us);

setInterval(function () {
    if (global.gc) {
        global.gc();
    }
}, 5000);

// routes
app.use('/', home);
app.use('/login', login);
app.use('/project', proj);
app.use('/process', proc);
app.use('/webserver', webr);
app.use('/upload', upld);
app.use('/upgrade', upgrade);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

module.exports = app;

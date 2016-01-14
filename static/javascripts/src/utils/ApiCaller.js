/**
 * Created by liuxinyi on 2015/8/14.
 */
var Q = require('q');
var request = require('superagent');
var swal = require('sweetalert');

var ApiCaller = {};

var host = window.document.location.hostname;

ApiCaller.API = {
    "PROCESSES_STATUS": "ws://" + host + ":8100",
    "PROCESS_LOG": "ws://" + host + ":8200",
    "PROCESS_TOGGLE": "process/toggle",
    "WEBSERVER_TOGGLE": "webserver/toggle",
    "UPLOAD_PACKAGE": "upload/package",
    "UPGRADE_STATE" : "upgrade/status",
    "UPGRADE_LOG" : "ws://" + host + ":8400",
    "PROJECT_REMOVE" : "project/delete",
    "PROJECT_WATCH_STATE" : "project/watch/state",
    "PROJECT_WATCH_SWITCH" : "project/watch/switch",
    "PROJECT_START_ALL": "project/startall",
    "PROJECT_START": "project/start",
    "PROJECT_STOP_ALL": "project/stopall",
    "PROJECT_STOP": "project/stop"
};

ApiCaller.get = function (url) {
    var deferred = Q.defer();

    request.get(url).end(function(err, res) {
        if(err != null) {
            swal('网络好像不太给力', '', 'info');
        }else if (res.status === 401) {
            window.location.assign('/login');
        }else {
            deferred.resolve(JSON.parse(res.text));
        }
    });

    return deferred.promise;
};

ApiCaller.post = function (url, data) {
    var deferred = Q.defer();

    request.post(url).send(data).end(function(err, res) {
        if(err != null) {
            if (res.status === 401) {
                window.location.assign('/login');
            }else{
                swal('网络好像不太给力', '', 'info');
            }
        }else {
            deferred.resolve(JSON.parse(res.text));
        }
    });

    return deferred.promise;
};

ApiCaller.delete = function (url) {
    var deferred = Q.defer();

    request.del(url).end(function(err, res) {
        if(err != null) {
            if (res.status === 401) {
                window.location.assign('/login');
            }else{
                swal('网络好像不太给力', '', 'info');
            }
        }else {
            deferred.resolve(JSON.parse(res.text));
        }
    });

    return deferred.promise;
};

ApiCaller.upload = function(url, files){
    var deferred = Q.defer();

    var req = request.post(url);
    var index = 0;
    files.forEach(function (file) {
        req.attach(index, file);
        index = index + 1;
    });
    req.end(function(err, res){
        if(err != null){
            if (err.status === 401) {
                window.location.assign('/login');
            } else {
                swal('网络好像不太给力', '', 'info');
            }
        }else{
            deferred.resolve(JSON.parse(res.text));
        }
    });

    return deferred.promise;
};

module.exports = ApiCaller;
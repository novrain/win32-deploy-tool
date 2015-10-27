/**
 * Created by rain on 2015/8/19.   -- copy form node-tail https://github.com/lucagrulla/node-tail -- modify use gaze
 */
/*jslint node:true */
/*jslint nomen:true */
/*jslint stupid:true */
'use strict';
var Tail, environment, events, fs,
    __bind = function (fn, me) {
        return function () {
            return fn.apply(me, arguments);
        };
    },
    __hasProp = {}.hasOwnProperty,
    __extends = function (child, parent) {
        var key;
        for (key in parent) {
            if (__hasProp.call(parent, key)) {
                child[key] = parent[key];
            }
        }
        function Ctor() {
            this.constructor = child;
        }

        Ctor.prototype = parent.prototype;
        child.prototype = new Ctor();
        child.__super__ = parent.prototype;
        return child;
    };
var Gaze = require('gaze').Gaze;
events = require("events");
fs = require('fs');
environment = process.env.NODE_ENV || 'development';

Tail = (function (_super) {
    __extends(Tail, _super);

    Tail.prototype.readBlock = function () {
        var block, stream,
            _this = this;

        if (this.queue.length >= 1) {
            block = this.queue.shift();
            if (block.end > block.start) {
                stream = fs.createReadStream(this.filename, {
                    start: block.start,
                    end: block.end - 1,
                    encoding: _this.encoding
                });
                stream.on('error', function (error) {
                    console.log("Tail error:" + error);
                    return _this.emit('error', error);
                });
                stream.on('end', function () {
                    if (_this.queue.length >= 1) {
                        return _this.internalDispatcher.emit("next");
                    }
                });
                return stream.on('data', function (data) {
                    var chunk, parts, _i, _len, _results;

                    _this.buffer += data;
                    parts = _this.buffer.split(_this.separator);
                    _this.buffer = parts.pop();
                    _results = [];
                    for (_i = 0, _len = parts.length; _i < _len; _i = _i + 1) {
                        chunk = parts[_i];
                        _results.push(_this.emit("line", chunk));
                    }
                    return _results;
                });
            }
        }
    };

    function Tail(filename, separator, encoding, fsWatchOptions, frombeginning) {
        var stats,
            _this = this;

        this.filename = filename;
        this.separator = separator !== null ? separator : '\n';
        this.encoding = encoding !== null ? encoding : "utf-8";
        this.fsWatchOptions = fsWatchOptions !== null ? fsWatchOptions : {};
        this.frombeginning = frombeginning !== null ? frombeginning : false;
        this.readBlock = __bind(this.readBlock, this);
        this.buffer = '';
        this.internalDispatcher = new events.EventEmitter();
        this.queue = [];
        this.isWatching = false;
        stats = fs.statSync(this.filename);
        this.internalDispatcher.on('next', function () {
            return _this.readBlock();
        });
        this.pos = this.frombeginning ? 0 : stats.size;
        this.watch();
    }

    Tail.prototype.watch = function () {
        var _this = this;

        if (this.isWatching) {
            return;
        }
        this.isWatching = true;
        this.watcher = new Gaze(this.filename);

        this.watcher.on('all', function (event, filepath) {
            if (filepath === _this.filename) {
                return _this.watchEvent(event);
            }
        });
    };

    Tail.prototype.watchEvent = function (e) {
        var stats,
            _this = this;

        if (e === 'changed') {
            stats = fs.statSync(this.filename);
            if (stats.size < this.pos) {
                this.pos = stats.size;
            }
            if (stats.size > this.pos) {
                this.queue.push({
                    start: this.pos,
                    end: stats.size
                });
                this.pos = stats.size;
                if (this.queue.length === 1) {
                    return this.internalDispatcher.emit("next");
                }
            }
        } else if (e === 'renamed') {
            this.unwatch();
            return setTimeout(function () {
                return _this.watch();
            }, 1000);
        }
    };

    Tail.prototype.watchFileEvent = function (curr, prev) {
        if (curr.size > prev.size) {
            this.queue.push({
                start: prev.size,
                end: curr.size
            });
            if (this.queue.length === 1) {
                return this.internalDispatcher.emit("next");
            }
        }
    };

    Tail.prototype.unwatch = function () {
        if (this.watcher) {
            this.watcher.close();
            this.pos = 0;
        }
        this.isWatching = false;
        this.queue = [];
    };
    return Tail;
}(events.EventEmitter));

exports.Tail = Tail;

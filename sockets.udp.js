// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var Event = require('cordova-plugin-chrome-apps-common.events');
var platform = cordova.require('cordova/platform');
var exec = cordova.require('cordova/exec');

function checkBufferSize(bufferSize) {
    if (bufferSize === null || bufferSize === undefined) return undefined;
    if (bufferSize > 65535) {
        return { resultCode: -1, message: 'Buffer size exceeds IPv4 UDP size limit of 65535.' };
    }
    if (bufferSize > 4294967295) {
        return { resultCode: -1, message: 'Buffer size exceeds IPv6 UDP size limit of 4294967295.' };
    }
    return undefined;
}

exports.create = function(properties, successCallback, errorCallback) {
    var bufferSizeError = checkBufferSize(properties.bufferSize);

    if (bufferSizeError) {
        if (errorCallback) errorCallback(error);
        return;
    }
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'create', [properties]);
};

exports.update = function(socketId, properties, successCallback, errorCallback) {
    var bufferSizeError = checkBufferSize(properties.bufferSize);

    if (bufferSizeError) {
        if (errorCallback) errorCallback(error);
        return;
    }
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'update', [socketId, properties]);
};

exports.setPaused = function(socketId, paused, successCallback, errorCallback) {
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'setPaused', [socketId, paused]);
};

exports.bind = function(socketId, address, port, successCallback, errorCallback) {
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'bind', [socketId, address, port]);
};

exports.send = function(socketId, data, address, port, successCallback, errorCallback) {
    var type = Object.prototype.toString.call(data).slice(8, -1);
    if (type != 'ArrayBuffer') {
        throw new Error('chrome.sockets.udp.send - data is not an ArrayBuffer! (Got: ' + type + ')');
    }
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'send', [socketId, address, port, data]);
};

exports.close = function(socketId, successCallback, errorCallback) {
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'close', [socketId]);
};

exports.getInfo = function(socketId, successCallback, errorCallback) {
    var win = successCallback && function(result) {
        result.persistent = !!result.persistent;
        result.paused = !!result.paused;
        successCallback(result);
    };
    exec(win, errorCallback, 'ChromeSocketsUdp', 'getInfo', [socketId]);
};

exports.getSockets = function(successCallback, errorCallback) {
    var win = successCallback && function(results) {
        for (var result in results) {
            result.persistent = !!result.persistent;
            result.paused = !!result.paused;
        }
        successCallback(results);
    };
    exec(win, errorCallback, 'ChromeSocketsUdp', 'getSockets', []);
};

exports.setBroadcast = function(socketId, enabled, successCallback, errorCallback) {
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'setBroadcast', [socketId, enabled]);
};

exports.joinGroup = function(socketId, address, successCallback, errorCallback) {
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'joinGroup', [socketId, address]);
};

exports.leaveGroup = function(socketId, address, successCallback, errorCallback) {
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'leaveGroup', [socketId, address]);
};

exports.setMulticastTimeToLive = function(socketId, ttl, successCallback, errorCallback) {
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'setMulticastTimeToLive', [socketId, ttl]);
};

exports.setMulticastLoopbackMode = function(socketId, enabled, successCallback, errorCallback) {
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'setMulticastLoopbackMode', [socketId, enabled]);
};

exports.getJoinedGroups = function(socketId, successCallback, errorCallback) {
    exec(successCallback, errorCallback, 'ChromeSocketsUdp', 'getJoinedGroups', [socketId]);
};

exports.onReceive = new Event('onReceive');
exports.onReceiveError = new Event('onReceiveError');

function registerReceiveEvents() {

    var win = function() {
        var info = {
            socketId: arguments[0],
            data: arguments[1],
            remoteAddress: arguments[2],
            remotePort: arguments[3]
        };
        exports.onReceive.fire(info);
    };

    // TODO: speical callback for android, DELETE when multipart result for
    // android is avaliable
    if (platform.id == 'android') {
        win = (function() {
            var data;
            var call = 0;
            return function(arg) {
                if (call === 0) {
                    data = arg;
                    call++;
                } else  {
                    var info = {
                        socketId: arg.socketId,
                        data: data,
                        remoteAddress: arg.remoteAddress,
                        remotePort: arg.remotePort
                    };

                    call = 0;

                    exports.onReceive.fire(info);
                }
            };
        })();
    }


    var fail = function(info) {
        exports.onReceiveError.fire(info);
    };

    exec(win, fail, 'ChromeSocketsUdp', 'registerReceiveEvents', []);
}

require('cordova-plugin-chrome-apps-common.helpers').runAtStartUp(registerReceiveEvents);

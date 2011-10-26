/*
 * Copyright (c) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Authors: Eric Bidelman <ericbidelman@chromium.org>
 */

// Dependencies.
var http = require('http');
var https = require('https');
var fs = require('fs');
var url = require('url');
var mime = require('mime');
var sys = require('sys');
var redis = require('redis');

//var formidable = require('formidable');
var sio = require('socket.io');

// Server global defaults.
var host = 'localhost';
var port = 8080;

mime.define({
    'application/x-chrome-extension': ['crx'], // Chrome Extensions / Apps
    'text/cache-manifest': ['.appcache', '.mf'] // Appcache manifest file.
});


function Server() {
    var self = this;
    this.server = http.createServer(this.onRequest.bind(this));
    this.server.listen(port, host);

    this.playingFile = null;

    var io = sio.listen(this.server);
    io.set('log level', 1);

    // Global state.
    var users = {};

    var livefeed = io.of('/livefeed').on('connection', function(socket) {
        console.log("LIVE FEED user logged in");

        // Redis client...
        var pub_queue = redis.createClient();
        // When we receive messages, treat them this way:
        pub_queue.on('message', function(channel, msg) {
            // We've received a message, push to user
            socket.json.emit("new_item", {type: "html", html: msg});
        });
        // Register to the REDIS queue 'public'
        pub_queue.subscribe('public');

        socket.on('disconnect', function() {
            console.log("livefeed disconnected");
            pub_queue.unsubscribe();
            pub_queue.quit();
        });
    });
    var moderator = io.of('/moderator').on('connection', function(socket) {
        // Functions called by the moderators
        console.log("Moderator logged in");
        // Redis client...
        var int_queue = redis.createClient();

        // When we receive messages, treat them this way:
        int_queue.on('message', function(channel, msg) {
            // Send to the admin's browser
            console.log("We've received something from the INTERNAL queue");
            var now = new Date();
            socket.json.emit("new_trash", {type: "msg", data: msg, stamp: now.toDateString()});
        });
        // Register to the REDIS queue 'public'
        int_queue.subscribe('internal');

        // keep the pub_queue open
        var pub_queue = redis.createClient();

        socket.on('broadcast', function(html) {
            // Send something to the 'public' queue
            console.log("html data", html);
            pub_queue.publish('public', html);
        });

        socket.on('disconnect', function() {
            console.log("moderator disconnected");
            int_queue.unsubscribe();
            int_queue.quit();
            pub_queue.quit();
            // disconnet pub_queue ?
        });
    });

    var publisher = io.of('/publisher').on('connection', function(socket) {
        // Functions called by the publishers
        console.log("Publisher logged in");
        var int_queue = redis.createClient();

        socket.on('publish', function(data) {
            console.log("WE'VE RECEIVED SOMETHING FROM THE PUBLISHER", data);
            // Send something to the ADMIN queues
            int_queue.publish('internal', data.data);
        });

        socket.on('disconnect', function() {
            console.log("publisher disconnected");
            int_queue.quit();
        });
    });

    console.log('Starting server at http://' + host + ':' + port + '...');
}

const TMP_FOLDER = 'tmp'; // Move into prototype

Server.prototype = {

    onRequest: function(req, res) {
        var path = this.getPath(req.url);
        var ext = this.getFileExtension(path);

        // Handler for serving song upload temp url.
        if (path.indexOf('/upload/' + TMP_FOLDER) == 0) {
            var rewrittenPath = (__dirname + path).replace('/upload', '');
            this.sendFile(res, rewrittenPath, ext);
            return;
        }

        switch (path) {
        case '/':
            this.sendFile(res, __dirname + '/client/index.html', '.html');
            // TODO(smus): Swap comments to serve dj app:
            //this.sendFile(res, __dirname + '/../index.html', '.html');
            this.sendFile(res, __dirname + '/client/index.html', '.html');
            break;
        case '/chat.html':
            this.sendFile(res, __dirname + '/client/chat.html', '.html');
            break;
        case '/proxy':
            this.proxy(req, res);
            break;
        default:
            // TODO(smus): Swap comments to serve dj app:
            //this.sendFile(res, __dirname + '/..' + path, ext);
            this.sendFile(res, __dirname + '/client' + path, ext);
        }
    },


    /**
     * Implements a proxy that takes two GET params:
     */
    proxy: function(request, response) {
        var params = this.parseParams(request.url);
        var accessToken = params.accessToken;
        var urlInfo = this.parseUrl(params.url);
        var options = {
            host: urlInfo.host,
            port: urlInfo.port,
            path: urlInfo.path,
            method: 'GET',
            headers: {
                Authorization: 'OAuth ' + accessToken
            }
        };

        response.writeHead(200, {'content-type': 'application/json'});
        var proxyRequest = https.request(options, function(proxyResponse) {
            //console.log('STATUS: ' + proxyResponse.statusCode);
            //console.log('HEADERS: ' + JSON.stringify(proxyResponse.headers));
            proxyResponse.setEncoding('utf8');
            proxyResponse.on('data', function (chunk) {
                //console.log('BODY: ' + chunk);
                response.write(chunk);
            });
            proxyResponse.on('close', function() {
                response.end();
            });
        });

        proxyRequest.on('error', function(e) {
            console.log('problem with request: ' + e.message);
        });

        // write data to request body
        proxyRequest.end();
    },

    /**
     * Return {k:v, l:w} given http://foo.com/bar?k=v&l=w
     */
    parseParams: function(u) {
        var out = {};
        var query = url.parse(u).query;
        if (query) {
            query.split('&').forEach(function(param) {
                var kv = param.split('=');
                out[kv[0]] = kv[1];
            });
        }
        return out;
    },

    /**
     * Return {host: host.com, path: foo} given http://host.com/foo
     */
    parseUrl: function(u) {
        var regex = /(https?):\/\/(.*?)(\/.*)/;
        var match = u && u.match(regex);
        var scheme = match[1];

        return match && {
            host: match[2],
            path: match[3],
            port: scheme === 'http' && 80 || 443
        } || {};
    },

    onWebSocketConnection: function(socket) {
    },

    onWebSocketDisconnect : function() {
    },


    sendFile : function(res, path, ext) {
        var self = this;
        var contenttype = mime.lookup(ext);

        fs.readFile(path, function(err, data) {
            if (err) {
                self.send404(res);
                return;
            }

            var headers = {
                'Content-Type': contenttype
            };

            if (ext == '.less') {
                var less = require('less');
                less.render(data.toString(), function(err, cssOutput) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    res.writeHead(200, {
                        'Content-Type': 'text/css'
                    });
                    res.write(cssOutput, 'utf8');
                    res.end();
                });
            } else if (ext == '.ogv') {
                headers['Content-Length'] = data.length;
                headers['Accept-Ranges'] = 'bytes';
                res.writeHead(200, headers);
                res.write(data);
                res.end();
            } else {
                res.writeHead(200, {
                    'Content-Type': contenttype
                });
                res.write(data, 'utf8');
                res.end();
            }
        });

    },

    send404 : function(res) {
        res.writeHead(404);
        res.write('404');
        res.end();
    },

    getFileExtension : function(path) {
        var ext = '.html';
        var parts = path.split('.');
        if (parts.length > 1) {
            ext = '.' + parts[parts.length - 1];
        }
        return ext;
    },

    getPath : function(rawurl) {
        var path = url.parse(rawurl).pathname;
        if (path.lastIndexOf('/') == path.length - 1) {
            path += 'index.html';
        }
        return path;
    }
};


var server = new Server();



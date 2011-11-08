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
var uuid = require('node-uuid');
var formidable = require('formidable');
var sio = require('socket.io');
var child_process = require('child_process');

// Server global defaults.
var host = '0.0.0.0';
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
    io.set('transports', ['jsonp-polling']);
    io.set('authorization', function(handshakeData, callback) {
        callback(null, true);
    });

    // Global state.
    var users = {};

    var livefeed = io.of('/livefeed').on('connection', function(socket) {
        console.log("LIVE FEED user logged in", arguments);

        // Redis client...
        var read_queue = redis.createClient();
        var write_queue = redis.createClient();
        // When we receive messages, treat them this way:
        read_queue.on('message', function(channel, msg) {
            // We've received a message, push to user
            socket.json.emit("new_item", {type: "html", html: msg});
        });
        // Register to the REDIS queue 'public'
        read_queue.subscribe('public');

        socket.on('comment', function(data) {
            console.log("New COMMENT in:", data);
            data.type = 'comment';
            data.stamp = (new Date()).toDateString();            
            // received data.data as the text.
            write_queue.publish('new_trash', JSON.stringify(data));
        });
        socket.on('disconnect', function() {
            console.log("livefeed disconnected");
            read_queue.unsubscribe();
            read_queue.quit();
            write_queue.quit();
        });
    });
    var moderator = io.of('/moderator').on('connection', function(socket) {
        // Functions called by the moderators
        console.log("Moderator logged in");
        // Redis client...
        var write_queue = redis.createClient();
        // keep the publication queue open
        var read_queue = redis.createClient();

        // When we receive messages, treat them this way:
        read_queue.on('message', function(channel, msg) {
            var msg = JSON.parse(msg);
            // Send to the admin's browser
            console.log("Got msg on internal queues", channel, msg);
            if (channel == 'new_trash') {
                // Broadcast to clients
                socket.json.emit("new_trash", msg);
            } else if (channel == 'new_nugget') {
                // Broadcast to clients
                socket.json.emit("new_nugget", msg);
            }
        });
        // Register to the REDIS queue 'public'
        read_queue.subscribe('new_trash');
        read_queue.subscribe('new_nugget');

        socket.on('broadcast', function(html) {
            // Send something to the 'public' queue
            console.log("html data", html);
            write_queue.publish('public', html);
        });

        socket.on('new_nugget', function(data) {
            console.log("new nugget", data);
            // Just stack anything AS IS
            write_queue.publish('new_nugget', JSON.stringify(data));
        });

        socket.on('disconnect', function() {
            console.log("moderator disconnected");
            read_queue.unsubscribe();
            read_queue.quit();
            write_queue.quit();
        });
    });

    var publisher = io.of('/publisher').on('connection', function(socket) {
        // Functions called by the publishers
        console.log("Publisher logged in");
        var write_queue = redis.createClient();

        socket.on('publish', function(data) {
            //console.log("Some publisher published: ", data);
            // Send something to the ADMIN queues
            if (data.type == 'img') {
                // Save the img to disk
                var saved = self.saveUploadedImage(data.data);
                var newdata = saved.data
                var absfile = saved.absfile
                // Replace the message with the LINK to the image
                data = newdata;
            }
            data.stamp = (new Date()).toDateString();

            write_queue.publish('new_trash', JSON.stringify(data));
        });

        socket.on('disconnect', function() {
            console.log("publisher disconnected");
            write_queue.quit();
        });
    });

    console.log('Starting server at http://' + host + ':' + port + '...');
}

const TMP_FOLDER = 'tmp'; // Move into prototype

Server.prototype = {

    onRequest: function(req, res) {
        var self = this;
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
        case '/mobile/publisher.html':
            if (req.method.toLowerCase() == 'post') {
                var form = new formidable.IncomingForm();
                form.parse(req, function(err, fields, files) {
                    // TODO: Verify the POST type.. 
                    // TODO: standardize with the publisher's interface
                    //res.writeHead(200, {'content-type': 'text/plain'});
                    //res.write('received upload:\n\n');
                    //res.end(sys.inspect({fields: fields, files: files}));
                    //return;
                    var saved = self.saveUploadedImage(fields.image_content);
                    var newdata = saved.data;
                    var absfile = saved.absfile;
                    var done = function() {
                        // Push to queue
                        var write_queue = redis.createClient();
                        write_queue.publish('new_trash', JSON.stringify(newdata));
                        write_queue.quit();
                        // Show the same file.
                        // Redirect to the REFERER URL.
                        res.writeHead(302, {location: req.headers.referer});
                        res.end("back to form");
                    };
                    child_process.exec("jhead -autorot " + absfile + "; ");

                });
                return;
            }
            this.sendFile(res, __dirname + '/client/mobile/publisher.html',
                          '.html');
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
        console.log("Serving file", path);
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
    },

    filterImage : function(imgpath, callback) {
        var absfile = __dirname + '/client' + imgpath;
        child_process.exec("jhead -autorot " + absfile + "; ");
    },

    saveUploadedImage : function(data) {
        // Save the img to disk
        var type_data = data.split(';');
        var mime_type = type_data[0].split(':')[1];
        var base64_data = type_data[1].split(',')[1];
        var this_uuid = uuid();
        if (mime_type == 'image/jpeg') {
            ext = ".jpg";
        } else if (mime_type == 'image/png') {
            ext = ".png";
        } else if (mime_type == 'image/gif') {
            ext = ".gif";
        }
        var path = '/images/' + this_uuid + ext
        var filename = __dirname + '/client' + path;
        var decoded = new Buffer(base64_data, 'base64');
        fs.writeFile(filename, decoded, function(err) {
            if (!err) { console.log("File saved"); }
            else { console.log("Ouch, file not saved"); }
        });

        var newdata = {type: "img_src",
                       src: path,
                       large_src: large_path};
        var absfile = filename;

        return {data: newdata, absfile: absfile}
    }
};


var server = new Server();



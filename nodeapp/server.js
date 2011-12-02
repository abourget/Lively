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
var express = require('express');
var mime = require('mime');
var sio = require('socket.io');
var mongoose = require('mongoose');

// New server
var app = express.createServer();
//var app.root_path = __dirname;

// Configure the app
require(__dirname + '/conf/configuration.js')(app, express);

mime.define({
    'application/x-chrome-extension': ['crx'], // Chrome Extensions / Apps
    'text/cache-manifest': ['.appcache', '.mf'] // Appcache manifest file.
});

// Connect to mongoose
mongoose.connect(app.set('db-uri'));
require(__dirname + '/models/models.js');


// Load the main controller code
require(__dirname + '/controllers/main.js')(app);

// Start the server
var host = '0.0.0.0';
var port = 8080;
console.log('Starting server at http://' + host + ':' + port + '...');
app.listen(port, host);

// Tie-in Socket.IO
var io = sio.listen(app);
require(__dirname + '/io/main_io.js')(io);


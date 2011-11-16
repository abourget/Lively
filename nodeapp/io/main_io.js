var redis = require('redis');
var images = require('../lib/images.js');
var mongoose = require('mongoose');
var ObjectId = mongoose.Types.ObjectId;
// load models
var User = mongoose.model('User');
var Event = mongoose.model('Event');
var Livefeed = mongoose.model('Livefeed');
var Nugget = mongoose.model('Nugget');

// Load helpers

module.exports = function(io) {

    io.set('log level', 1);
    io.set('transports', ['jsonp-polling']);
    io.set('authorization', function(data, accept) {
        // At least makes sure the event exists, we'll authenticate truly
        // a bit later (TODO)
        console.log("SocketIO handshake data", data);
        if (!data.query.feedname) {
            accept("No feedname specified", false);
            return;
        }
        // Look-up the Event, authenticate, etc..
        Event.findOne({_id: data.query.feedname}, function(err, data) {
            if (err || !data) { accept("No such event", false); }
            else { accept(null, true); }
        });
    });

    var livefeed = io.of('/livefeed').on('connection', function(socket) {
        var feedname = socket.handshake.query.feedname;
        var trash_chan = 'new_trash-' + feedname;
        var public_chan = 'public-' + feedname;
        console.log("LIVE FEED user logged in");

        // pushing latest HTML snippets
        Livefeed.find({event: feedname}, function(err, docs) {
            docs.forEach(function(el) {
                socket.json.emit("new_item", {type: "html", html: el.html});
            });
        });

        // Redis client...
        var read_queue = redis.createClient();
        var write_queue = redis.createClient();
        // When we receive messages, treat them this way:
        read_queue.on('message', function(channel, msg) {
            // We've received a message, push to user
            socket.json.emit("new_item", {type: "html", html: msg});
        });
        // Register to the REDIS queue 'public'
        read_queue.subscribe(public_chan);
        
        socket.on('comment', function(data) {
            console.log("New COMMENT in:", data);
            data.type = 'comment';
            data.stamp = (new Date()).toDateString();            
            // received data.data as the text.
            write_queue.publish(trash_chan, JSON.stringify(data));
        });
        socket.on('disconnect', function() {
            console.log("livefeed disconnected");
            read_queue.unsubscribe();
            read_queue.quit();
            write_queue.quit();
        });
    });
    var moderator = io.of('/moderator').on('connection', function(socket) {
        var feedname = socket.handshake.query.feedname;
        var trash_chan = 'new_trash-' + feedname;
        var nugget_chan = 'new_nugget-' + feedname;
        var public_chan = 'public-' + feedname;

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
            console.log("Got msg on internal queues", channel, msg, trash_chan, nugget_chan);
            if (channel == trash_chan) {
                // Broadcast to clients
                console.log("Sending a new_trash");
                socket.json.emit("new_trash", msg);
            } else if (channel == nugget_chan) {
                // Broadcast to clients
                socket.json.emit("new_nugget", msg);
            }
        });
        // Register to the REDIS queue 'public'
        read_queue.subscribe(trash_chan);
        read_queue.subscribe(nugget_chan);
        
        socket.on('broadcast', function(html) {
            // Send something to the 'public' queue
            console.log("html data", html);
            var lf = new Livefeed({html: html, event: feedname,
                                   editor: new ObjectId("123123123123")});
            lf.save();
            write_queue.publish(public_chan, html);
        });
        
        socket.on('new_nugget', function(data) {
            console.log("new nugget", data);
            // Just stack anything AS IS
            write_queue.publish('new_nugget-' + feedname, JSON.stringify(data));
        });
        
        socket.on('disconnect', function() {
            console.log("moderator disconnected");
            read_queue.unsubscribe();
            read_queue.quit();
            write_queue.quit();
        });
    });

    var publisher = io.of('/publisher').on('connection', function(socket) {
        var feedname = socket.handshake.query.feedname;
        var trash_chan = 'new_trash-' + feedname;

        // Functions called by the publishers
        console.log("Publisher logged in");
        var write_queue = redis.createClient();
        
        socket.on('publish', function(data) {
            //console.log("Some publisher published: ", data);
            // Send something to the ADMIN queues
            if (data.type == 'img') {
                // Save the img to disk
                var saved = images.saveUploadedImage(data.data);
                var newdata = saved.data
                var absfile = saved.absfile
                // Replace the message with the LINK to the image
                data = newdata;
            }
            data.stamp = (new Date()).toDateString();
            
            write_queue.publish(trash_chan, JSON.stringify(data));
        });
        
        socket.on('disconnect', function() {
            console.log("publisher disconnected");
            write_queue.quit();
        });
    });


}; /* end exports */
var redis = require('redis');


module.exports = function(io) {

    io.set('log level', 1);
    io.set('transports', ['jsonp-polling']);
    io.set('authorization', function(handshakeData, callback) {
        callback(null, true);
    });

    var livefeed = io.of('/livefeed').on('connection', function(socket) {
        console.log("LIVE FEED user logged in");

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


}; /* end exports */
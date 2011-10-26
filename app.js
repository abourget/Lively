
io.sockets.on('connection', function (socket) {

    // We're on!
    socket.emit('news', { hello: 'world' });

    // Register Socket.IO handlers
    socket.on('suggest', function(data) {
        // This is received from anyone.. content pushed in by the public

        // Data is received this way:
        // {"type": "text", "content": "<h1>whatever</h1>"}
        console.log(data);
    });




    /**
     * Moderator-related stuff
     */
    socket.on('publish', function (data) {
        // When the moderator/admin says its a GO, and wants to publish to the clients
        // {"type": "template_nameorwhatever", "content": "<div class=\"blah\">Image and text</div>"}
        public_push = redis.createClient();
        public_push.publish('public', data.content);
    });

    
});

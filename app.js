var app = require('http').createServer(handler)
, io = require('socket.io').listen(app)
, fs = require('fs')
, redis = require("redis"),

// Main server listener
app.listen(8080);


function handler (req, res) {
    fs.readFile(__dirname + '/index.html',
                function (err, data) {
                    if (err) {
                        res.writeHead(500);
                        return res.end('Error loading index.html');
                    }

                    res.writeHead(200);
                    res.end(data);
                });
}

io.sockets.on('connection', function (socket) {
    // Redis client...
    public_queue = redis.createClient();
    // When we receive messages, treat them this way:
    public_queue.on('subscribe', function(channel, msg) {
        
    });
    // Register to the REDIS queue 'public'
    public_queue.subscribe('public');

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

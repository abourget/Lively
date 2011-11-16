var formidable = require('formidable');
var uuid = require('node-uuid');
var fs = require('fs');
var child_process = require('child_process');
var mongoose = require('mongoose')
var ObjectId = mongoose.Types.ObjectId;
// Load models
var User = mongoose.model('User');
var Event = mongoose.model('Event');


function saveUploadedImage(data) {
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
    
    return {data: newdata, absfile: absfile};
};


/**
 * This function ensures the event exists, is valid, and that the user has
 * certain rights for administration or publishing
 */
function ensureEvent(event_param, permission) {
    function eventFilterMiddleware(req, res, next) {
        var ev = Event.findOne({_id: req.params[event_param]}, function(err, data) {
            if (err) { next(new Error("No such event")); }
            req.event = data;
            console.log(data);
            next()
        });
    };
    return eventFilterMiddleware;
}



module.exports = function(app) {

    app.get('/', function(req, res) {
        res.render('index.html', {
            locals: {bob: 'go',
                     title: "Welcome to this page that includes Lively"},
        });
    });

    app.get('/publisher/:event_id', ensureEvent('event_id', 'publish'), function(req, res, next) {
        res.render("publisher.html", {locals: {event: req.event},
                                      layout: false});
    });

    app.get('/mytest', function(req, res) {
        //var u = new User();
        //u.set('lastname', 'Bourget').set('firstname', 'Alexandre')
        //    .set('email', 'alex@bourget.cc');
        //u.save();
        var e = new Event();
        e.set('name', 'Japan earthquakes 2011')
            .set('creator', new ObjectId("123123123123"))
            .set('created_at', new Date())
            .set('_id', 'japan2011');
        e.save()
        res.render('thanks.html', {thanks: 'ok'});
    });

    app.post('/mobile/publisher.html', function(req, res) {
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

        res.redirect('back');
    });



}; /* end exports */
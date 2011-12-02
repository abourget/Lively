var formidable = require('formidable');
var mongoose = require('mongoose')
var images = require('../lib/images.js');
var ObjectId = mongoose.Types.ObjectId;
// Load models
var User = mongoose.model('User');
var Event = mongoose.model('Event');



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
        res.render('index', {bob: 'go',
                     title: "Welcome to this page that includes Lively"});
    });

    app.get('/publisher/:event_id', ensureEvent('event_id', 'publish'), function(req, res, next) {
        res.render("publisher", {event: req.event});
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
        res.render('thanks', {thanks: 'ok'});
    });

    app.post('/mobile/publisher.html', function(req, res) {
        var feedname = req.params.feedname;
        var form = new formidable.IncomingForm();
        form.parse(req, function(err, fields, files) {
            // TODO: Verify the POST type.. 
            // TODO: standardize with the publisher's interface
            //res.writeHead(200, {'content-type': 'text/plain'});
            //res.write('received upload:\n\n');
            //res.end(sys.inspect({fields: fields, files: files}));
            //return;
            var write_queue = redis.createClient();
            var saved = images.processUploadedImage(fields.image_content, feedname, "new_trash-" + feedname, write_queue, function() {
                write_queue.quit();
                res.redirect('back');
                //res.writeHead(302, {location: req.headers.referer});
                //res.end("back to form");
            });
        });
        return;

        res.redirect('back');
    });



}; /* end exports */
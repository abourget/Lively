var formidable = require('formidable');
var uuid = require('node-uuid');
var fs = require('fs');
var child_process = require('child_process');
//var sys = require('util');


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




module.exports = function(app) {

    app.get('/', function(req, res) {
        res.render('index.html', {
            locals: {bob: 'go',
                     title: "Welcome to this page that includes Lively"},
        });
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
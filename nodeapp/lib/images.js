var uuid = require('node-uuid');
var child_process = require('child_process');
var fs = require('fs');
//child_process.exec("jhead -autorot " + absfile + "; ");


/**
 * Images manip. library
 */


/**
 * This function makes everything necessary to add an image to the flow
 * It will write the image, rotate it, do all the dirty work, and then
 * publish to the specified queue that a new_trash was added.
 * takes as parameters:
 * - data: the data object as sent by the client
 * - feedname: the name of the feed
 * - trash_chan: the queue to publish to when its done
 * - redis: the redis connexion
 * - next: the function to call when we're done (optional)
 */
var processUploadedImage = function(data, feedname, trash_chan, redis, next) {
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
    var filename = __dirname + '/../client' + path;
    var decoded = new Buffer(base64_data, 'base64');
    fs.writeFile(filename, decoded, function(err) {
        if (!err) { console.log("File saved"); }
        else { console.log("Ouch, file not saved", err); }
    });
    
    var newdata = {type: "img_src",
                   src: path,
                   large_src: "large_path",
                   stamp: (new Date()).toDateString()};

    var absfile = filename;


    redis.publish(trash_chan, JSON.stringify(newdata));

    if (next) { next(); }
};


module.exports = {processUploadedImage: processUploadedImage}

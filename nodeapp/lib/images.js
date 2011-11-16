var uuid = require('node-uuid');
var child_process = require('child_process');
var fs = require('fs');
//child_process.exec("jhead -autorot " + absfile + "; ");


/**
 * Images manip. library
 */

var saveUploadedImage = function(data) {
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
                   large_src: "large_path"};
    var absfile = filename;
    
    return {data: newdata, absfile: absfile};
};


module.exports = {saveUploadedImage: saveUploadedImage}

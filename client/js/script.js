/* Author: 
  Alexandre Bourget et Jean-Maxime Couillard, Hackathon HTML5 du 26 octobre 2011.
*/

var dropbox;
var livefeed, moderator, publisher;

jQuery(document).ready(function(){
    // Define socket connection
    livefeed = io.connect('/livefeed');
    moderator = io.connect('/moderator');
    publisher = io.connect('/publisher');

    // Defnie socket events
    livefeed.on('new_item', function(data) {
        console.log("New item", data);
    });
    moderator.on('new_trash', function(data) {
        console.log("New trash", data);
    });
	
    // Init event handlers
    dropbox = document.getElementById("dropbox");
    dropbox.addEventListener("dragenter", noopHandler, false);
    dropbox.addEventListener("dragexit", noopHandler, false);
    dropbox.addEventListener("dragover", noopHandler, false);
    dropbox.addEventListener("drop", drop, false);
    
    // Publisher events
    $("#publisherText").keypress(sendPublisherText);
          
})

    
function sendPublisherText(e) {
    if(e.which == 13) {
        var val = $("#publisherText").val();
        publisher.json.emit('publish', {type: "text", data: val});
        console.log("emitting", val);
    }
};


function noopHandler(evt) {
    evt.stopPropagation();
    evt.preventDefault();
}


function drop(evt) {
	
    noopHandler(evt);
    var files = evt.dataTransfer.files;
    var count = files.length;

    // Only call the handler if 1 or more files was dropped.
    if (count > 0) handleFiles(files);
}


function handleFiles(files) {

    var file = files[0];

    document.getElementById("droplabel").innerHTML = "Processing " + file.name;

    var reader = new FileReader();

    // init the reader event handlers
    reader.onloadend = handleReaderLoadEnd;

    // begin the read operation
    reader.readAsDataURL(file);

}

function handleReaderLoadEnd(evt) {
    var img = document.getElementById("preview");
    img.src = evt.target.result;
}






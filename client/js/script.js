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
        var el = $('#live_feed').prepend($(data.html));
    });
    moderator.on('new_trash', function(data) {
        console.log("New trash", data);
        var tpl = ich.moderator_snippet(data);
        $(tpl, '.datanode').data('data', data);
        var el = $('#live_trash').append(tpl);
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

function keep_snippet(moderator_el) {
    // When we add to the nuggets list
    var data = $(moderator_el).parents('.datanode').data('data');
    var tpl = ich.nugget_snippet(data);
    $(tpl, '.datanode').data('data', data);
    var el = $('#nuggets').append(tpl);
}

function publish_snippet(nugget_el) {
    // When we want to publish to the LIVE FEED
    var rootnode = $(nugget_el).parents('.datanode');
    var html = rootnode.html();
    //var data = .data('data');
    //console.log('hello');
    console.log("Sending HTML", html);
    moderator.emit('broadcast', html);
}

function enable_moderator() {
    $('#moderator').show();
}

    
function sendPublisherText(e) {
    if(e.which == 13) {
        var val = $("#publisherText").val();
        publisher.json.emit('publish', {type: "text", data: val});
        console.log("emitting", val);
        $('#publisherText').val('');
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






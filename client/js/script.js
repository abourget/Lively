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
    

    // Moderator events
    $("#moderatorBtn").toggle(function(){
        $("#moderator").css('display', 'block');
    },function(){
        $("#moderator").css('display', 'none');
    });
    
    // Moderator drag/drop events
    var tplsrcs = document.querySelectorAll('.tplsrc');
    [].forEach.call(drags, function(tplsrc) {
        tplsrc.addEventListener("dragend", tplsrcDrop, false);
    });
    
    setModeratorDragDrop();      
})


// Appel cette fonction a chaque entrée de trucs draggable
function setModeratorDragDrop() {   
     
     var nuggets = document.querySelectorAll('.nugget_snippet');
     [].forEach.call(nuggets, function(nugget) {
         nugget.addEventListener("dragend", nuggetDrop, false);
     });     
}

// tplsrc
function tplsrcDrop(e) {
    var srcDiv = e.srcElement;
    var targetDiv = e.targetElement;
    
    //FONCTION
}

// nugget drop 
function nuggetDrop(e) {
    var srcDiv = e.srcElement;
    var targetDiv = e.targetElement;
    
    //FONCTION
}

function keep_snippet(moderator_el) {
    // When we add to the nuggets list
    var data = $(moderator_el).parents('.datanode').data('data');
    var tpl = ich.nugget_snippet(data);
    $(tpl, '.datanode').data('data', data);
    var el = $('#nuggets').append(tpl);
}

function publish_snippet(nugget_el) {
    /* DEPRECATED, we don't publish snippets anymore */
    // When we want to publish to the LIVE FEED
    var rootnode = $(nugget_el).parents('.datanode');
    var html = rootnode.html();
    //var data = .data('data');
    //console.log('hello');
    console.log("Sending HTML", html);
    moderator.emit('broadcast', html);
}

function publish_chunk() {
    /*  Main PUBLISHING function.. take the staging broadcast area and SENDS it over */
    var html = $('#broadcast').html();
    console.log("Sending HTML", html);
    moderator.emit('broadcast', html);
}

function enable_moderator() {
    $('#moderator').show();
}
function enable_publisher() {
    $('#publisher').show();
}

    
function sendPublisherText(e) {
    if(e.which == 13) {
        var val = $("#publisherText").val();
        publisher.json.emit('publish', {type: "text", data: val});
        console.log("emitting", val);
        $('#publisherText').val('');
        $('#sent_message').html("Sending message: " + val);
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






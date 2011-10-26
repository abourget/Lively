/* Author: 
  Alexandre Bourget et Jean-Maxime Couillard, Hackathon HTML5 du 26 octobre 2011.
*/

var socket, dropbox;

jQuery(document).ready(function(){

    // Define socket connection
    socket = io.connect('http://localhost');
    dropbox = document.getElementById("dropbox");

    // Defnie socket events
    socket.on('news', function (data) {
      console.log(data);
      socket.emit('my other event', { my: 'data' });
    });
	
    // Init event handlers
    dropbox.addEventListener("dragenter", noopHandler, false);
    dropbox.addEventListener("dragexit", noopHandler, false);
    dropbox.addEventListener("dragover", noopHandler, false);
    dropbox.addEventListener("drop", drop, false);
    
    console.log(dropbox);

})


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






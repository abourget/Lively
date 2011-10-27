/* Author: 
  Alexandre Bourget et Jean-Maxime Couillard, Hackathon HTML5 du 26 octobre 2011.
*/

/*
Random quotes:

 Woah, you should see the awesome food I'm eating right now.
 
 We just hacked an app from scratch, and learned NodeJS !

*/

/*
 YouPush is just like Cover It Live, but for the free man.  It is similar (at least from the output perspective) to what you get from Gizmodo's, Engadget's and other news outlets "Live news coverage" pages.

 It was hacked in 6 hours at the HTML5 Hackathon in Montreal, on October 26th 2011.  Since then, we might have added a couple of things but we got something fully functional with text inputs on that day, including templates and drag'n'drop for layout and publishing, the live trash and the nuggets panels.

 Demoed:
  nodejs
   - some code based on crhack (DJBreakpoint ?)
  nodejs-socketio (client and server)
   - websockets
  node-redis
   - broadcasting queues
  icanhaz (templating based on Mustache)
  jQuery
  CSS3 buttons
  HTML5 boilerplate (by Paul Irish)
  CSS Fonts
*/


var dropbox;
var livefeed, moderator, publisher;

var template_loader = null;
var push_data = null;

jQuery(document).ready(function(){
    
    // Define socket connection
    livefeed = io.connect('/livefeed', {'transports': ['xhr-polling']});
    // TODO: put this in enable_moderator()
    moderator = io.connect('/moderator');
    // TODO: put this in enable publisher()
    publisher = io.connect('/publisher');

    // TODO: implement something for people to push COMMENTS, that will arrive
    // also in the internal pipe, as a special content type.  A separate
    // permission can be used for that, and is not the same as PUBLISHER, which 
    // provide formatted content

    // Defnie socket events
    livefeed.on('new_item', function(data) {
        console.log("New item", data);
        var el = $('#live_feed').prepend($(data.html));
    });



    // TODO: put this in the enable_moderator() code
    moderator.on('new_trash', function(data) {
        console.log("New trash", data);
        var tpl = ich.moderator_snippet(data);
        $(tpl, '.datanode').data('data', data);
        var el = $('#live_trash').append(tpl);
    });
	
    // TODO; see http://html5demos.com/js/h5utils.js  for addEvent polyfill

    // Moderator drag/drop events
    var tpl_srcs = document.querySelectorAll('.tplsrc');
    [].forEach.call(tpl_srcs, function(tpl_src) {
        tpl_src.addEventListener("dragend", function(e) {
            var srcDiv = e.srcElement;
            var targetDiv = e.targetElement;
            console.log("dragend for the tpl_src", targetDiv);
        });
    });
    
    var broadcast = $('#broadcast')[0];
    console.log("Applying broadcast listeners");
    broadcast.addEventListener('drop', function(e) {
        console.log("boo");
         if (e.stopPropagation) {
             e.stopPropagation(); // Stops some browsers from redirecting.
         }

        console.log("DROPPED", e);
        
        var data = getDataTransfer(e);
        if (data.type == 'template') {
            var tpl_name = data.cnt;
            console.log("Loading template", tpl_name);
            $('#broadcast').html(ich['template_' + tpl_name]({}));
            set_bindings_broadcaster();
        }

        return false;
    });
    broadcast.addEventListener('dragenter', function(e) {
        var type = e.dataTransfer.getData('local/type');
        $(broadcast).addClass(type + '-over');
        console.log("added", type+'-over');
    });
    broadcast.addEventListener('dragleave', function(e) {
        var type = e.dataTransfer.getData('local/type');
        $(broadcast).removeClass(type + '-over');
        console.log("removed", type+'-over');
    });
    broadcast.addEventListener('dragover', function(e) {
        if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
        return false;
    })

    // Add handlers for the templates tags
    var tplItems = document.querySelectorAll('.tplsrc');
    console.log("Tpl items", tplItems);
    for (var i = 0; i < tplItems.length; i++) {
        tplItems[i].addEventListener('dragstart', function (e) {
            // store the ID of the element, and collect it on the drop later on
            setDataTransfer(e, {type: 'template', cnt: $(this).data('tplname')});
            return false;
        });
    }




    // TODO: put that in enable_publisher()
    // Init event handlers for image upload
    dropbox = document.getElementById("dropbox");
    dropbox.addEventListener("dragenter", dnd_cancel);
    dropbox.addEventListener("dragexit", dnd_cancel);
    dropbox.addEventListener("dragover", function(e) {
        if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
        return false;
    });
    dropbox.addEventListener("drop", function(e) {
        noopHandler(evt);
        var files = evt.dataTransfer.files;
        var count = files.length;

        // Only call the handler if 1 or more files was dropped.
        if (count > 0) handleFiles(files);

        return false;
    });
    // Publisher events
    $("#publisherText").keypress(sendPublisherText);

})


/* JSON wrapped to data transfers */
/* required because of bug in Chrome: http://code.google.com/p/chromium/issues/detail?id=31037 .. doesn't support Custom URIs.. should have see, setData returns 'false' when it fails */
function setDataTransfer(ev, obj) {
    ev.dataTransfer.setData('text/plain', JSON.stringify(obj));
}
function getDataTransfer(ev) {
    return JSON.parse(ev.dataTransfer.getData('text/plain'));
}

function set_bindings_broadcaster() {
    $('#broadcast .zone').each(function(el) {
        var self = this;
        this.addEventListener('drop', function(e) {
            if (e.stopPropagation) {
                e.stopPropagation(); // stops the browser from redirecting.
            }
            console.log("BETTER DROP on zone");
            data = getDataTransfer(e); 
            console.log("data from dtTrans", data);
            var src = e.target;
            if ($(src).data('type') == 'text') {
                $(src).html(data.cnt.data);
            }

            return false;
        });
    });
}


function keep_snippet(moderator_el) {
    // When we add to the nuggets list
    var data = $(moderator_el).parents('.datanode').data('data');
    var tpl = ich.nugget_snippet(data);
    $(tpl, '.datanode').data('data', data);
    var el = $('#nuggets').append(tpl);
    attach_nugget_dnd(tpl[0], data);
}

function attach_nugget_dnd(el, data) {
    // DND support for new nuggets (live trash that we want to keep :)
    el.addEventListener('dragstart', function(e) {
        setDataTransfer(e, {type: "nugget", cnt: data});
        return false;
    });
}


function publish_chunk() {
    //  Main PUBLISHING function..
    //  takes the staging #broadcast area and SENDS it over to livefeed
    var html = $('#broadcast').html();
    console.log("Sending HTML", html);
    moderator.emit('broadcast', html);

    // Reset broadcast
    $('#broadcast').html('Drop your template here.');
}

function enable_moderator() {
    $('#moderator').show();
}
function enable_publisher() {
    $('#publisher').show();
    $('#publisher input[type=text]').focus();
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


function dnd_cancel(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (e.preventDefault) {
        e.preventDefault();
    }
}

function noopHandler(evt) {
    evt.stopPropagation();
    dnd_cancel(evt);
}


/**
 * Handle image upload drop
 */
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






/* Author: 
 *   Alexandre Bourget (c) alex@bourget.cc
 */
var LIVELY = LIVELY || {};
if (LIVELY.root_url === undefined) {
    LIVELY.root_url = 'http://lively.abourget.net';
}
if (LIVELY.feed_name === undefined) {
    LIVELY.feed_name = '';
}

(function($) { /* start module */

var feedname = LIVELY.feed_name;

var dropbox;
var moderator, publisher;


/* outerHTML, stolen from: http://www.yelotofu.com/2008/08/jquery-outerhtml/ */
$.fn.outerHTML = function(s) {
    return (s)
        ? this.before(s).remove()
        : jQuery("<p>").append(this.eq(0).clone()).html();
}


function add_over_class(type, prevent_default) {
    function active(e) {
        // Prevent default ?
        if (prevent_default && e.preventDefault) { e.preventDefault(); }

        var data = getDataTransfer(e);
        if (data.type == type) {
            $(broadcast).addClass(data.type + '-over');
            //console.log("add class", data.type + '-over');
        }
        return false;
    }
    return active
}
function remove_over_class(type, prevent_default) {
    function active(e) {
        // Prevent default ?
        if (prevent_default && e.preventDefault) { e.preventDefault(); }

        var data = getDataTransfer(e);
        if (data.type == type) {
            $(broadcast).removeClass(data.type + '-over');
            //console.log("remove class", data.type + '-over');
        }
        return false;
    }
    return active;
}


/* JSON wrapped to data transfers */
/* required because of bug in Chrome: http://code.google.com/p/chromium/issues/detail?id=31037 .. doesn't support Custom URIs.. should have see, setData returns 'false' when it fails */
function setDataTransfer(ev, obj) {
    data_xfer = obj;
    return;

    // Useless, doesn't provide the data in the dragenter or dragleave events!
    ev.dataTransfer.setData('text/plain', JSON.stringify(obj));
}
function getDataTransfer(ev) {
    return data_xfer;

    // This doesn't work in the dragenter event! darn it!
    var data = ev.dataTransfer.getData('text/plain');
    if (data) {
        return JSON.parse(data);
    }
    return {};
}

var binding_functions = function() {
    // zone here is the dropping zone, so an element which receives the data
    // data is the data object as transited from the beginning of the "publish"
    // in the new_trash box.

    /** to_html filters */
    this.text_to_html =  function(zone, data) {
        $(zone).html(data.data);
    }
    this.comment_to_html = this.text_to_html;
    this.quote_to_html = function(zone, data) {
        $(zone).html(data.quote);
    }

    /** to_blockquote filters */
    function _to_blockquote_put_stamp(zone, data) {
        var stamp = $(zone).parent().find('.stamp');
        stamp.html(data.stamp);
        stamp.attr('contenteditable', "true");
    }
    this.quote_to_blockquote = function(zone, data) {
        $(zone).html(data.quote + ' &mdash; ' + data.author);
        _to_blockquote_put_stamp(zone, data);
    }
    this.text_to_blockquote = function(zone, data) {
        $(zone).html(data.data);
        _to_blockquote_put_stamp(zone, data);
    }
    this.comment_to_blockquote = this.text_to_blockquote;

    /** to_value filters */
    this.text_to_value = function(zone, data) {
        $(zone).val(data.data);
    }
    this.comment_to_value = this.text_to_value;

    /** to_img filters */
    this.img_src_to_img = function(zone, data) {
        $('img', zone).attr('src', data.src);
    }

    return this;
}();


function set_bindings_broadcaster() {
    $('#broadcast .zone').each(function(el) {
        var self = this;
        this.addEventListener('drop', function(e) {
            if (e.stopPropagation) {
                e.stopPropagation(); // stops the browser from redirecting.
            }
            data = getDataTransfer(e); 
            var src = e.target;
            if (!$(src).hasClass('zone')) {
                src = $(src).parents('.zone')[0];
            }
  
            // Call a binding functions attached via "data-bind='text_to_html'"
            var droppable_type = data.cnt.type;
            var bind_suffix = $(src).data('bind');
            var bind_func = droppable_type + '_' + bind_suffix;
            if (binding_functions[bind_func] === undefined) {
                alert("Cannot drop nugget type: " + droppable_type + " onto droppable zone, using the " + bind_suffix + " functions (" + bind_func + ')');
            } else {
                binding_functions[bind_func](src, data.cnt);
            }

            remove_over_class('nugget')(e);

            return false;
        });
        this.addEventListener('dragenter', add_over_class('nugget', true));
        this.addEventListener('dragleave', remove_over_class('nugget', true));
        this.addEventListener('dragover', function(e) {
            if (e.preventDefault) e.preventDefault();
            add_over_class('nugget')(e);
            return false;
        });
    });
}


function keep_snippet(moderator_el) {
    // When we add to the nuggets list
    var data = $(moderator_el).parents('.datanode').data('data');
    // Send to the queue, for others to see also.
    moderator.json.emit('new_nugget', data);
}
 
function attach_nugget_dnd(el, data) {
    // DND support for new nuggets (live trash that we want to keep :)
    el.addEventListener('dragstart', function(e) {
        $(el).css('opacity', 0.4);
        setDataTransfer(e, {type: "nugget", cnt: data});
        return false;
    });
    el.addEventListener('dragend', function(e) {
        console.log(e);
        $(el).css('opacity', 1.0);
        return remove_over_class('nugget')(e);
    });

}


function publish_chunk() {
    //  Main PUBLISHING function..
    //  takes the staging #broadcast area and SENDS it over to livefeed
    
    // TODO: remove nodes that aren't appropriate
    $('#broadcast [draggable]').attr('draggable', null);
    $('#broadcast [contenteditable]').attr('contenteditable', null);
    $('#broadcast [data-type]').attr('data-type', null);
    $('#broadcast [data-bind]').attr('data-bind', null);
    $('#broadcast .zone').removeClass('zone');
    $('#broadcast [src]').each(function(el) {
        // Make sure SRC elements are ABSOLUTE
        console.log(el, this, this.src, $(this).attr('src'));
        if ($(this).attr('src')[0] == '/') {
            $(this).attr('src', LIVELY.root_url + $(this).attr('src'));
        }
    });
    $('#broadcast .delete')
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


/** Handle the QUOTE form */
function publisher_quote_keypress(e) {
    if(e.which == 13) {
        var val1 = $("#publisher_quote").val();
        var val2 = $("#publisher_author").val();
        publisher.json.emit('publish', {type: "quote",
                                        quote: val1,
                                        author: val2});
        $('#publisher_quote, #publisher_author').val('');
        $('#sent_message').html("Sending quote: " + val1 + " - " + val2);
    }
};

/** Handle the straight text form */
function publisher_text_keypress(e) {
    if(e.which == 13) {
        var val = $("#publisher_text").val();
        publisher.json.emit('publish', {type: "text", data: val});
        $('#publisher_text').val('');
        $('#sent_message').html("Sending quote: " + val);
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
    publisher.json.emit('publish', {type: "img", data: evt.target.result});
}




$(document).ready(function(){
    
    // TODO: put this in enable_moderator()
    moderator = io.connect('/moderator?feedname=' + feedname);
    // TODO: put this in enable publisher()
    publisher = io.connect('/publisher?feedname=' + feedname);

    // TODO: put this in the enable_moderator() code
    moderator.on('new_trash', function(data) {
        console.log("New trash", data);
        var inner_tpl = dust.render('snippet_' + data.type, data, function(err, inner_tpl) {
            var tpl = dust.render('moderator_wrapper', {inner_tpl: inner_tpl, data: data}, function(err, tpl_html) {
                var tpl = $(tpl_html);
                $(tpl, '.datanode').data('data', data);
                var el = $('#live_trash').append(tpl);
                attach_nugget_dnd(tpl[0], data);  // Allow streaming trash to be used
            });
        });
    });
    moderator.on('new_nugget', function(data) {
        console.log("New nugget", data);
        var inner_tpl = dust.render('snippet_' + data.type, data, function(err, inner_tpl) {
            var tpl = dust.render('nugget_wrapper', {inner_tpl: inner_tpl, data: data}, function(err, tpl_html) {
                var tpl = $(tpl_html);
                $(tpl, '.datanode').data('data', data);
                var el = $('#nuggets').append(tpl);
                attach_nugget_dnd(tpl[0], data);  // Allow streaming trash to be used
            });
        });
    });
	
    // TODO; see http://html5demos.com/js/h5utils.js  for addEvent polyfill

    // Moderator drag/drop events
    var broadcast = $('#broadcast')[0];
    console.log("Applying broadcast listeners");
    broadcast.addEventListener('drop', function(e) {
        if (e.stopPropagation) {
            e.stopPropagation(); // Stops some browsers from redirecting.
        }

        var data = getDataTransfer(e);
        if (data.type == 'template') {
            var tpl_name = data.cnt;
            dust.render('template_' + tpl_name, {}, function(err, tpl) {
                $('#broadcast').html(tpl);
                set_bindings_broadcaster();
            });
        }

        remove_over_class('template')(e);

        return false;
    });
    broadcast.addEventListener('dragenter', add_over_class('template'));
    broadcast.addEventListener('dragleave', remove_over_class('template'));
    broadcast.addEventListener('dragend', function(e) {
        console.log("OOPS!");
        if (drag_src_el) {
            $(drag_src_el).css('opacity', 1.0);
        }
        return remove_over_class('template')(e);
    });
    broadcast.addEventListener('dragover', function(e) {
        if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
        add_over_class('template')(e);
        return false;
    });

    // Add handlers for the templates tags
    var tpl_srcs = document.querySelectorAll('.template_src');
    //console.log("Tpl items", tpl_srcs);
    for (var i = 0; i < tpl_srcs.length; i++) {
        tpl_srcs[i].addEventListener('dragstart', function (e) {
            // store the ID of the element, and collect it on the drop later on
            var data = {type: 'template', cnt: $(this).data('tplname')}
            //console.log("setting data on the TPL_SRC event obj", data);
            setDataTransfer(e, data);
            return false;
        });
    }


    /* Map the KEEP buttons */
    $('#moderator').delegate('button.keep', 'click', function() {
        keep_snippet(this);
        return false;
    });


    /* Publish button handler */
    $('#publish_button button').click(function() {
        publish_chunk();
        return false;
    });

    // TODO: put that in enable_publisher()
    // Init event handlers for image upload
    dropbox = document.getElementById("dropbox");
    dropbox.addEventListener("dragenter", dnd_cancel);
    dropbox.addEventListener("dragleave", dnd_cancel);
    dropbox.addEventListener("dragover", function(e) {
        if (e.preventDefault) e.preventDefault(); // Necessary. Allows us to drop.
        return false;
    });
    dropbox.addEventListener("drop", function(e) {
        noopHandler(e);
        var files = e.dataTransfer.files;
        var count = files.length;

        // Only call the handler if 1 or more files was dropped.
        if (count > 0) handleFiles(files);

        return false;
    });
    // Publisher events
    $("#publisher_text").keypress(publisher_text_keypress);
    $("#publisher_author, #publisher_quote").keypress(publisher_quote_keypress);
    

})







})(jQuery); /* end module */
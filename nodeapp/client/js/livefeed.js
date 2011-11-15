/** Author: 
 * LICENSE: GNU Affero General Public License version 3
 * Alexandre Bourget (c) 2011
 */

var LIVELY = LIVELY || {};
if (LIVELY.root_url === undefined) {
    LIVELY.root_url = 'http://lively.abourget.net';
}

LIVELY.init = function($) { /* start module */
    var livefeed;

    function commenter_text_keypress(e) {
        if(e.which == 13) {
            var val = $("#commenter_text").val();
            livefeed.json.emit('comment', {data: val});
            //console.log("emitting", val);
            $('#commenter_text').val('');
            $('#commenter_message').html("Sending message: " + val);
        }
    };

    $(document).ready(function(){

        // Load base-layout;
        $('#LIVELY-cnt').html('\
          <h2>Lively Feed</h2>\
        \
          <div id="LIVELY-feed"></div>\
\
          <div class="LIVELY-commentbox">\
            <span>Comment <small class="small">then hit ENTER</small>:</span>\
            <input type="text" id="commenter_text" accesskey="c" />\
            <div id="commenter_message"></div>\
          </div>\
\
          <div class="LIVELY-footer">\
            Keyboard shortcuts: <b>Alt+C</b> to go to Comment box\
          </div>');
    
        // Define socket connection
        livefeed = LIVELY.io.connect(LIVELY.root_url + '/livefeed', {'transports': ['jsonp-polling', 'websocket']});

        // Define socket events
        livefeed.on('new_item', function(data) {
            //console.log("New item", data);
            var el = $('#LIVELY-feed').prepend($(data.html));
        });

        $("#commenter_text").keypress(commenter_text_keypress);
    })


}; /* end module */

yepnope([
    // Load jQuery, and make it noConflict
    {load: LIVELY.root_url + "/js/libs/jquery-1.6.4.min.js",
     complete: function() {
         LIVELY.jQuery = jQuery.noConflict(true);
         LIVELY._io = window.io;
     }
    },
    // Load Socket.IO, let's assume no one uses that.. otherwise we'll need to
    // prefix it, or let's change the global object for a LIVELY.io namespace
    {load: LIVELY.root_url + "/socket.io/socket.io.js",
     complete: function() {
         // Make socket.io non-conflicting
         LIVELY.io = window.io;
         // TODO: before being able to do that, JSONP should return LIVELY.io.j instead of "io.j" as a callback.. Is that configurable on the server-side ?
         //window.io = LIVELY._io;

         LIVELY.init(LIVELY.jQuery);
     }},
    {load: LIVELY.root_url + "/css/livefeed.css"}
]);
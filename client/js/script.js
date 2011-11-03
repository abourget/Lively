/* Author: 
  Alexandre Bourget et Jean-Maxime Couillard, Hackathon HTML5 du 26 octobre 2011.
*/

/*
 Lively is like Cover It Live or ScribbleLive, but for the free man.  It is similar (at least from the output perspective) to what you get from Gizmodo's, Engadget's and other news outlets "Live news coverage" pages.

 It was hacked in 6 hours at the HTML5 Hackathon in Montreal, on October 26th 2011.  Since then, we might have added a couple of things but we got something fully functional with text inputs on that day, including templates and drag'n'drop for layout and publishing, the live trash and the nuggets panels.

TODO: implement the SERVER-SIDE saving of the feed, and re-showing upon next page load.. (so that we can continue the flow)
TODO: implement server-side permissions checks
TODO: implement authentication
TODO: implement "multiple live events" on the service (using name-prefixed queues)
TODO: flag the content as USED when someone uses it in a broadcasted template, gray it out for all moderators


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

var LIVELY = LIVELY || {};

(function($) { /* start module */



    var livefeed;


    function commenter_text_keypress(e) {
        if(e.which == 13) {
            var val = $("#commenter_text").val();
            livefeed.json.emit('comment', {data: val});
            console.log("emitting", val);
            $('#commenter_text').val('');
            $('#commenter_message').html("Sending message: " + val);
        }
    };

    $(document).ready(function(){
    
        // Define socket connection
        livefeed = io.connect('/livefeed'); //, {'transports': ['xhr-polling']});

        // Define socket events
        livefeed.on('new_item', function(data) {
            console.log("New item", data);
            var el = $('#LIVELY-feed').prepend($(data.html));
        });

        $("#commenter_text").keypress(commenter_text_keypress);
    })







})(jQuery); /* end module */
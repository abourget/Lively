var mongooseAuth = require('mongoose-auth');

/**
 * Default configuration manager
 * Inject app and express reference
 */
module.exports = function(app,express) {

    app.set('view engine', 'mustache')
    app.register(".html", require('stache'));
    app.use(express.logger('default'));
    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.session({secret: "super bob"}));
    //app.use(mongooseAuth.middleware());
    app.use(express.static(__dirname + '/../client'));
		
    // DEVELOPMENT
    app.configure('development', function() {
        app.set('db-uri', 'mongodb://localhost/lively-development');	       
        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
    });
    
    // PRODUCTION
    app.configure('production', function() {
        app.set('db-uri', 'mongodb://localhost/lively-production');
        app.use(express.errorHandler({ dumpExceptions: true, showStack: false }));
    });		

    // TEST
    app.configure('test', function() {
	require("./test.js")(app,express);
    });    

    // Add the helpers, as per: https://github.com/bnoguchi/mongoose-auth
    //mongooseAuth.helpExpress(app);

}
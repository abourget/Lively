/**
 *  User schema
 **/
 
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
var mongooseAuth = require('mongoose-auth');


var User = new Schema({
    firstname: {type: String, required: false},
    lastname: {type: String, required: false},
    email: {type: String, required: true},
    password: {type: String, required: false},
    created_on: Date
});

var Event = new Schema({
    // use _id as the primary key, but not an ObjectId
    name: {type: String, required: true},
    creator: {type: ObjectId},
    created_on: Date
});

var Nugget = new Schema({
    event: String,
    creator: {type: ObjectId},
    editor: {type: ObjectId},
    content: {},
});

var Livefeed = new Schema({
    event: String,
    editor: ObjectId,
    html: String
});


// tack in authentication
User.plugin(mongooseAuth, {
    everymodule: {
        everyauth: {
            User: function () {
                return User;
            }
        }
    },
    facebook: {
        everyauth: {
            myHostname: 'http://127.0.0.1:8080',
            appId: 'MYAPPID',
            appSecret: 'SUPER SCRET',
            redirectPath: '/'
        }
    },
    google: {
        everyauth: {
            appId: "778560693140.apps.googleusercontent.com",
            appSecret: "N9EVAHv3MPUw-VPPqofG0PpT",
            scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
        }
    }
});

mongoose.model('User', User);
mongoose.model('Event', Event);
mongoose.model('Nugget', Nugget);
mongoose.model('Livefeed', Livefeed);
var deviceInfo = function() {
    document.getElementById("ready").style.display = 'block';
    document.getElementById("loading").style.display = 'none';
    clearTimeout(init_timeout);

    /*
    document.getElementById("platform").innerHTML = device.platform;
    document.getElementById("version").innerHTML = device.version;
    document.getElementById("uuid").innerHTML = device.uuid;
    document.getElementById("name").innerHTML = device.name;
    document.getElementById("width").innerHTML = screen.width;
    document.getElementById("height").innerHTML = screen.height;
    document.getElementById("colorDepth").innerHTML = screen.colorDepth;
    */
};

var getLocation = function() {
    var suc = function(p) {
        alert(p.coords.latitude + " " + p.coords.longitude);
    };
    var locFail = function() {
    };
    navigator.geolocation.getCurrentPosition(suc, locFail);
};

var beep = function() {
    navigator.notification.beep(2);
};

var vibrate = function() {
    navigator.notification.vibrate(0);
};

function roundNumber(num) {
    var dec = 3;
    var result = Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
    return result;
}

var accelerationWatch = null;

function updateAcceleration(a) {
    document.getElementById('x').innerHTML = roundNumber(a.x);
    document.getElementById('y').innerHTML = roundNumber(a.y);
    document.getElementById('z').innerHTML = roundNumber(a.z);
}

var toggleAccel = function() {
    if (accelerationWatch !== null) {
        navigator.accelerometer.clearWatch(accelerationWatch);
        updateAcceleration({
            x : "",
            y : "",
            z : ""
        });
        accelerationWatch = null;
    } else {
        var options = {};
        options.frequency = 1000;
        accelerationWatch = navigator.accelerometer.watchAcceleration(
                updateAcceleration, function(ex) {
                    alert("accel fail (" + ex.name + ": " + ex.message + ")");
                }, options);
    }
};

var preventBehavior = function(e) {
    e.preventDefault();
};

function fail(msg) {
    alert(msg);
}

function submit_pic(data) {
    // Submit form with image data
    //document.getElementById("test_img").src = "data:image/jpeg;base64," + data;
    document.getElementById("image_submit_content").value = "data:image/jpeg;base64," + data;
    document.forms["image_submit_form"].submit();
    // TODO: implement a PUSH to a certain URL with certain parameters:
    // using jQuery's AJAX framework, or just submit a form.
}

function take_pic() {
    navigator.camera.getPicture(submit_pic, fail, {
        quality: 85,
        sourceType: Camera.PictureSourceType.CAMERA,
        targetWidth: 800,
        targetHeight: 800
    });
}
function select_pic() {
    navigator.camera.getPicture(submit_pic, fail, {
        quality: 85,
        sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
        targetWidth: 800,
        targetHeight: 800
    });
}


function close() {
    var viewport = document.getElementById('viewport');
    viewport.style.position = "relative";
    viewport.style.display = "none";
}

function contacts_success(contacts) {
    alert(contacts.length
            + ' contacts returned.'
            + (contacts[2] && contacts[2].name ? (' Third contact is ' + contacts[2].name.formatted)
                    : ''));
}

function get_contacts() {
    var obj = new ContactFindOptions();
    obj.filter = "";
    obj.multiple = true;
    navigator.contacts.find(
            [ "displayName", "name" ], contacts_success,
            fail, obj);
}

function check_network() {
    var networkState = navigator.network.connection.type;

    var states = {};
    states[Connection.UNKNOWN]  = 'Unknown connection';
    states[Connection.ETHERNET] = 'Ethernet connection';
    states[Connection.WIFI]     = 'WiFi connection';
    states[Connection.CELL_2G]  = 'Cell 2G connection';
    states[Connection.CELL_3G]  = 'Cell 3G connection';
    states[Connection.CELL_4G]  = 'Cell 4G connection';
    states[Connection.NONE]     = 'No network connection';

    confirm('Connection type:\n ' + states[networkState]);
}


init_timeout = null;
function init() {
    // the next line makes it impossible to see Contacts on the HTC Evo since it
    // doesn't have a scroll button
    // document.addEventListener("touchmove", preventBehavior, false);
    document.addEventListener("deviceready", deviceInfo, true);
    init_timeout = setTimeout(function() {
        document.getElementById("nodevice").style.display = 'block';
        document.getElementById("loading").style.display = 'none';
    }, 700);
    // TODO: launch a timeout function that we would cancel if the deviceready
    // is launched first.
}

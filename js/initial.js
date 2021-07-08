/*
  Copyright © 2020 Karl Henning
*/

var apiUrl = document.location.origin + "/api/ar-maps/";
var device_latitude = null;
var device_longitude = null;
var device_altitude = null;
var alpha = null;
var beta = null;
var gamma = null;
var i = 0;



// Button Functions
document.body.onclick = function(e) {
  var e = window.event ? event.srcElement : e.target;
  if (e.type && e.type == "checkbox") getTypes(e.name, e.checked, device_latitude, device_longitude);
  if (e.id == "rocket") rocket(e);
  if (e.id == "closebtn") closeNav();
  if (e.id == "openNav") openNav();
  if (e.id == "closebtn") closeInfo();
};

document.body.oninput = function(e) {
  var e = window.event ? event.srcElement : e.target;
  if (e.className == "slider") slide(e.value);
};

document.body.onkeyup = function(e) {
  var e = window.event ? event.srcElement : e.target;
  if (e.id == "myInput") myFunction();
}

function getURL(aUrl, aCallback) {
  try {
    var anHttpRequest = new XMLHttpRequest();
    anHttpRequest.onreadystatechange = function() {
      if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
        aCallback(anHttpRequest.responseText);
    }
    anHttpRequest.open('GET', aUrl, true);
    anHttpRequest.send();
  } catch (e) {
    alert('request error: ' + e)
  }
}

var mapScriptToggle = false;

function a(durch, x, val) {
  return (durch * (val - 1) + x) / val;
}

function gyro(declination) {
  console.log("declination is " + declination + "°");
  if (window.DeviceOrientationEvent) {
    window.addEventListener("deviceorientation", function(event) {
      if (i <= 10) {
        if (event.webkitCompassHeading) {
          if (comp != event.webkitCompassHeading) {
            comp = event.webkitCompassHeading;
            if (event.beta < -45 && event.beta > -90) {
              console.log("down");
              comp = (comp + 180) % 360
            } else if (event.beta < 135 && event.beta > 90) {
              console.log("up");
              comp = (comp + 180) % 360
            }
            var abw = (event.alpha - (360 - (comp + declination)) + 360) % 360;
            // console.log(360-(event.alpha - (360 - (comp + declination)) + 360) % 360, 360-(event.alpha - (360 - comp) + 360) % 360);
            dabw = a(dabw, abw, i);
            // console.log(abw, dabw, event.alpha, comp);
            i += 1;
          }
        } else {
          console.log("Your browser doesn't support 'webkitCompassHeading'");
        }
      }
      alpha = (event.alpha - dabw + 360) % 360;
      beta = event.beta;
      gamma = event.gamma;
    }, false);

  } else {
    alert("Your browser doesn't support 'Device Orientation'")
  }
}

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(function(position) { // watchPosition(function(position) {
    //if(true) {
    device_latitude = position.coords.latitude;
    device_longitude = position.coords.longitude;
    device_altitude = position.coords.altitude;
    //}

    /*
    else { // entfernen
      var places = {
        "Berlin": [52.520737, 13.409490],
        "Greppin": [51.659890, 12.297268],
        "Marienstrasse": [52.105236, 11.627078]
      }
      var place = places["Marienstrasse"]
      device_latitude = place[0]
      device_longitude = place[1]

      getURL(apiUrl+'elevation?point=' + device_latitude + ',' + device_longitude, function(response) {
        device_altitude = JSON.parse(response)['results'][0]['elevation']; // TODO: edit java web-api
      });
    }
    */
    device_altitude += 2;


    if (!mapScriptToggle) {
      mapScriptToggle = true;
      getURL(apiUrl + "mapScript?functionName=" + initMap.name, function(response) {
        eval(response);
      });
    }

    // f  s     !       true
    // f  f     true

    // gyro(0)  https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=51.7591297&lon1=11.4619062&resultFormat=csv

    // Rough implementation. Untested.
    function timeout(ms, promise) {
      return new Promise(function(resolve, reject) {
        setTimeout(function() {
          reject(new Error("timeout"))
        }, ms);
        promise.then(resolve, reject)
      })
    }
    timeout(1500, fetch('https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination?lat1=' + device_latitude + '&lon1=' + device_longitude + '&resultFormat=csv')).then(response => response.text()).then(text => {
      declination = parseFloat(text.replace(/^#.*$/gm, '').trim().split(',')[4]);
      if (!isNaN(declination)) {
        localStorage.declination = declination;
        gyro(declination)
      } else {
        throw "Declination-Server not accessable!";
      }
    }).catch(function(error) {
      console.log(error);
      if (!isNaN(localStorage.declination)) {
        declination = parseFloat(localStorage.declination);
        gyro(declination)
      } else {
        console.log(error);
        gyro(0)
      }
    })

  }, function showError(error) {
    var constant;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        constant = "User denied the request for Geolocation.";
        break;
      case error.POSITION_UNAVAILABLE:
        constant = "Location information is unavailable.";
        break;
      case error.TIMEOUT:
        constant = "The request to get user location timed out.";
        break;
      default:
        constant = "An unknown error occurred.";
        break;
    }
    alert(constant)
  });
} else {
  alert("Your browser doesn't support 'geolocation'")
}


var geraete = {
  "IPhone": {
    "goesse": [4.8, 3.6],
    "brennweite": 4
  }
};
var geraet = geraete.IPhone;
var bildwinkel_h = 2 * Math.atan(geraet.goesse[1] / (2 * geraet.brennweite));
var bildwinkel_v = 2 * Math.atan(geraet.goesse[0] / (2 * geraet.brennweite));
// console.log(bildwinkel_v/bildwinkel_h);



if (typeof window.DeviceMotionEvent.requestPermission === 'function') {
  // iOS 13+
  console.log("iOS 13+");

  var button = document.createElement('button');
  button.setAttribute('class', "btn-user");
  button.setAttribute('id', "motion");
  button.setAttribute('type', "button");
  button.innerHTML = "Motion";
  button.onclick = function () {
    window.DeviceMotionEvent.requestPermission()
    .then(response => {
      console.log(response);
      if (response == 'granted') {
        console.log("motion sensor permission granted");
      } else {
        alert("motion sensor permission not granted");
      }
    })
  };

  document.getElementById('oldstuff').appendChild(button);
} else {
  // non iOS 13+
  console.log("non iOS 13+");
}

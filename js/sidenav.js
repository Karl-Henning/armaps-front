/*
  Copyright © 2020 Karl Henning
*/

let dframe = document.getElementById("dframe");
var extra;

function format(text){
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function create_h2_p(name, info) {
  var h2 = document.createElement('h2');
  h2.innerHTML = name.charAt(0).toUpperCase() + name.slice(1) +":";
  dframe.appendChild(h2);
  for (var i = 0; i < info.length; i++) {
    var p = document.createElement('p');
    p.innerHTML = info[i]
    dframe.appendChild(p);
  }
}

function create_h2_a(name, info) {
  var h2 = document.createElement('h2');
  h2.innerHTML = name.charAt(0).toUpperCase() + name.slice(1) +":";
  dframe.appendChild(h2);
  for (var i = 0; i < info.length; i++) {
    var a = document.createElement('a');
    a.innerHTML = info[i]
    a.setAttribute('href', info[i]);
    dframe.appendChild(a);
  }
}

function create_h2_img(name, info) {
  var h2 = document.createElement('h2');
  h2.innerHTML = name.charAt(0).toUpperCase() + name.slice(1) +":";
  dframe.appendChild(h2);
  for (var i = 0; i < info.length; i++) {
    var img = document.createElement('img');
    img.setAttribute('src', info[i]);
    dframe.appendChild(img);
  }
}

function openInfo(obj) {
  var data = null
  for (var i = 0; i < objects.length; i++) {
    if (objects[i]["id"] == obj["id"]) {
      data = objects[i]
      break
    }
  }
  while (dframe.firstChild) {
    dframe.removeChild(dframe.firstChild);
  }
  var extraT = false;
  var links = false;
  if (data["data"] != null) {
    console.log(data["data"]);

    for (var key in data["data"]) {

      if (key == "link") {
        links = true;
        continue;
      }

      if (key == "extra") {
        extraT = true;
        continue;
      }
      if (key == "ort") {
        continue;
      }
      var h1 = document.createElement('h1');
      h1.innerHTML = key.charAt(0).toUpperCase() + key.slice(1) +":";
      dframe.appendChild(h1);

      if (key == "address") {
        var a = document.createElement('a');
        a.innerHTML = data["data"][key]
        a.setAttribute('href', "http://maps.apple.com/?q="+data["data"][key]);
        dframe.appendChild(a);
        continue;
      }

      var p = document.createElement('p');
      p.innerHTML = data["data"][key]
      dframe.appendChild(p);
    }

    if (links) {
      for (var link in data["data"]["link"]) {
        console.log(link, data["data"]["link"][link]);
        create_h2_img(format(link), [data["data"]["link"][link]])
      }
    }



    console.log(data["origin"]);
    if (data["origin"] == "server") {
      if (extraT) {
        for (var i = 0; i < data["data"]["extra"].length; i++) {
          links = false;
          extra = data["data"]["extra"][i]
          for (key in extra) {
            if (key == "link") {
              links = true;
              continue;
            }
            var h2 = document.createElement('h2');
            h2.innerHTML = key.charAt(0).toUpperCase() + key.slice(1) +":";
            dframe.appendChild(h2);
            var p = document.createElement('p');
            p.innerHTML = extra[key]
            dframe.appendChild(p);
          }
          if (links) {
            for (link in extra["link"]) {
              if (link == "biography") {
                var a = document.createElement('a');
                a.setAttribute('href', extra["link"][link]);
                a.innerHTML = "Biography";
                dframe.appendChild(a);
              }
            }
          }
        }
      }
    } else if (data["origin"] == "maps") {
      extra = false;
      for (key in data["data"]) {
        if (key == "extra") {
          extra = true;
          continue;
        }
      }
      if (!extra) {
        getURL(apiUrl+'placeid?placeid=' + data["id"], function(response) {
          var result = JSON.parse(response)["result"];

          for (key in result) {
            if (key == "international_phone_number") {
              create_h2_a("Tel.", ["tel:"+result[key]])
            }
            if (key == "opening_hours") {
              create_h2_p("Opening Hours", result[key]["weekday_text"])
            }
            if (key == "website") {
              create_h2_a("Website", [result[key]])
            }
          }

        });
      }
    } else {
      console.log("wrong origin: ", data);
    }

  } else {
    var dis = document.createElement('p');
    dis.innerHTML = "Kein Element gefunden!"
    dframe.appendChild(dis);
  }
  document.getElementById("info").style.top = "0px";
  document.getElementById("info").style.display = "block";
}

function closeInfo() {
  document.getElementById("info").style.display = "none";
}

function openNav() {
  document.getElementById("mySidenav").style.width = "38.2%";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0%";
}

function myFunction() {
  var input, filter, ul, li, a, i;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  ul = document.getElementsByClassName("scroll");
  li = document.getElementsByClassName("container");
  for (i = 0; i < li.length; i++) {
    var span = li[i].getElementsByTagName("span")[0];
    if (span.innerHTML.toUpperCase().indexOf(filter) > -1) {
      li[i].style.display = "";
    } else {
      li[i].style.display = "none";
    }
  }
}

function calculateZoom(alti){
  var length = Math.tan(bildwinkel_v/2) * alti;
  var lat = device_latitude;
  var wp = document.getElementById("video-stream").offsetHeight;
  var ratio = 1;
  var k = wp * 156543.03392 * Math.cos(degToRad(lat));
  var myZoom = Math.log(k/length)/Math.LN2;
  myZoom =  myZoom -1;
  return(myZoom);
}

var map
var r_zoom
function initMap() {
  map = new google["maps"]["Map"](document.getElementById('map'), {
    "zoom": 12,
    "center": {"lat": device_latitude, "lng": device_longitude},
    "disableDefaultUI": true,
    "draggable": false
  });
  var customStyled = [
    {
      "featureType": "all",
      "elementType": "labels",
      "stylers": [
        { "visibility": "off" }
      ]
    },{
      "featureType": "road",
      "elementType": "labels",
      "stylers": [
        { "visibility": "on" }
      ]
    }
  ];
  map["set"]('styles',customStyled);
  google["maps"].event.addListener(map, 'idle', function(event) {
    var array = map["getBounds"]()
    var bounds = []
    for (var a in array) {
      if (array.hasOwnProperty(a)) {
        for (var b in array[a]) {
          if (array[a].hasOwnProperty(b)) {
            bounds.push(array[a][b])
          }
        }
      }
    }
    r_zoom = Math.round(distance(bounds[0], bounds[1], bounds[2], bounds[3])/2);
    if (r_zoom < 1000) {
      document.getElementById("entf").innerHTML = r_zoom+"m"
    } else {
      document.getElementById("entf").innerHTML = Math.round(r_zoom/100)/10+"km"
    }
  }
  );

  var terrain_map = new google["maps"]["Map"](document.getElementById("terrain_map"), {
    //mapTypeId: 'satellite',
    "zoom": calculateZoom(2500),
    "center": {"lat": device_latitude, "lng": device_longitude},
    "mapTypeId": 'satellite',
    "disableDefaultUI": true,
    "draggable": false
  });
}
function slide(val) {
  map["setZoom"](9+parseFloat(val));
}

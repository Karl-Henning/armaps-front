/*
  Copyright © 2020 Karl Henning
*/

let objects = [];

function radToDeg(rad) {
  return rad * (180 / Math.PI);
}

function degToRad(deg) {
  return deg * (Math.PI / 180);
}

function getRotationMatrix(alpha, beta, gamma) {

  let _x = degToRad(beta); // beta value
  let _y = degToRad(gamma); // gamma value
  let _z = degToRad(alpha); // alpha value

  let cX = Math.cos(_x);
  let cY = Math.cos(_y);
  let cZ = Math.cos(_z);
  let sX = Math.sin(_x);
  let sY = Math.sin(_y);
  let sZ = Math.sin(_z);

  //
  // ZXY rotation matrix construction.
  //

  let m11 = cZ * cY - sZ * sX * sY;
  let m12 = -cX * sZ;
  let m13 = cY * sZ * sX + cZ * sY;

  let m21 = cY * sZ + cZ * sX * sY;
  let m22 = cZ * cX;
  let m23 = sZ * sY - cZ * cY * sX;

  let m31 = -cX * sY;
  let m32 = sX;
  let m33 = cX * cY;

  return [
    [m11, m12, -m13],
    [m21, m22, -m23],
    [m31, m32, -m33]
  ];

};

function mToV(m) {
  let vm = [];
  for (let i = 0; i < m.length; i++) {
    let v = [];
    for (let a = 0; a < m[i].length; a++) {
      v.push(m[a][i]);
    }
    vm.push(v);
  }
  return vm;
}

// Math
function scalar(v1, v2) {
  let value = 0;
  for (let i = 0; i < v1.length; i++) {
    value += v1[i] * v2[i];
  }
  return value;
}

function mult(v, value) {
  return [
    v[0] * value,
    v[1] * value,
    v[2] * value
  ];
}

function v_min(v1, v2) {
  return [
    v1[0] - v2[0],
    v1[1] - v2[1],
    v1[2] - v2[2]
  ];
}

function v_angle(v1, v2) {
  return Math.acos(scalar(v1, v2) / (v_len(v1) * v_len(v2)));
}

function v_len(v) {
  return Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2) + Math.pow(v[2], 2))
}

function create(object, x, y, width, distance, rotation, index) {
  let container;
  if (document.getElementById(object["id"])) {
    container = document.getElementById(object["id"]);
    container.setAttribute('style', "z-index: "+index+"; right: "+x+"px; top: "+y+"px; width: "+width+"px; transform: translate(calc(var(--main-size)/2), -50%) rotate("+rotation+"deg);");
  } else {
    container = document.createElement('div');
    container.setAttribute('class', "symbol");
    container.setAttribute('id', object["id"]);
    if(object['origin'] !== "stephaneum"){
      container.onclick = function() {openInfo(this)};
    } else {
      container.onclick = function() {
        window.location = object["info"]["link"]
      };
    }
    container.setAttribute('style', "z-index: "+index+"; right: "+x+"px; top: "+y+"px; width: "+width+"px; zIndex: "+index+"; transform: translate(calc(var(--main-size)/2), -50%) rotate("+rotation+"deg);");

    let name = document.createElement('span');
    name.setAttribute('class', "name");
    if(object['origin'] === "stephaneum"){
      name.innerText = object["name"];
    } else {
      if ("name" in object["data"]) {
        name.innerText = object["data"]["name"];
      } else {
        name.innerText = "Stolperstein"; // IDEA: verbessern! type in object speichern
      }
    }

    container.appendChild(name);

    let div1 = document.createElement('div');
    div1.setAttribute('class', "data");
    let span1 = document.createElement('span');
    if (distance < 1000) {
      span1.innerText = distance+"m"
    } else {
      span1.innerText = Math.round(distance/100)/10+"km"
    }
    div1.appendChild(span1);
    let span2 = document.createElement('span');
    span2.setAttribute('href', "javascript: void(0);");
    span2.innerHTML = " \u2219 ";
    div1.appendChild(span2);
    let span3 = document.createElement('span');
    if(object['origin'] === "stephaneum"){
      span3.innerText = object["info"]["address"];
    } else {
      span3.innerText = object["data"]["address"];
    }
    div1.appendChild(span3);
    container.appendChild(div1);

    let div2 = document.createElement('div');
    div2.setAttribute('class', "icon");
    let img = document.createElement('img');
    if(object['origin'] === "stephaneum"){
      img.setAttribute('src', object["info"]["icon"]);
    } else {
      img.setAttribute('src', object["icon"]);
    }
    div2.appendChild(img);
    container.appendChild(div2);

    o_frame.appendChild(container);
  }
}

function gerV(pos, obj) {
  let v = v_min(obj, pos);
  let latitudeCircumference = 40075160 * Math.cos(degToRad(pos[0]));
  let resultX = v[1] * latitudeCircumference / 360;
  let resultY = v[0] * 40008000 / 360;
  return [resultX, resultY, v[2]]
}


function start() {
  if (alpha != null && beta != null && gamma != null && device_latitude != null && device_longitude != null && device_altitude != null) {
    // getTypes("point_of_interest", true, device_latitude, device_longitude)
    requestAnimationFrame(renderLoop);
  } else {
    requestAnimationFrame(start);
  }
}

let declination = null;
let comp = null;
let dabw = 0;
i = 1;

let oldx = "";
let o_frame = document.getElementById("objects");
let frame = document.getElementById("video-stream");

let w = frame.offsetWidth;
let h = frame.offsetHeight;
let cw = document.body.clientWidth;
let ch = document.body.clientHeight;
let oh;
let ow;

let alti_ist = 0;
let alti_soll = 0;
let rocketSteps = [0, 500, 1000, 2500];
let inc = 20;

let d_orientation = true;
function orientation_c() {
  if (Math.abs(window.orientation) === 90) { // Landscape
    d_orientation = false;
    let message = document.createElement('div');
    message.setAttribute("id", "orientation_m");
    let m_test = document.createElement('span');
    m_test.innerHTML = "Rotate your device into portrait mode";
    message.appendChild(m_test);
    document.body.appendChild(message);
  } else { // Portrait
    try {
      document.getElementById("orientation_m").remove();
    } catch (err) {
      console.log("Correct orientation!");
    }
    oh = Math.round(document.body.clientWidth*0.11);
    ow = Math.round(document.body.clientWidth/2);
    d_orientation = true;
    requestAnimationFrame(renderLoop);
  }
}
orientation_c();
window.addEventListener("orientationchange", orientation_c);


function rocket(icon) {
  index = rocketSteps.indexOf(alti_soll)
  alti_soll = rocketSteps[(index+1)%rocketSteps.length]

  if (alti_soll == 0) {
    document.getElementById("terrain_map").style.opacity = 0;
    icon.style.borderWidth = "0px"
  } else if (alti_soll > 0) {
    document.getElementById("terrain_map").style.opacity = 100;
    icon.style.borderWidth = "8px"
  }
}

function d_pos(m, vector) { // calculate position on display
  let v2 = v_min(vector, mult(m[2], scalar(vector, m[2]))); // Projezierter Vektor auf Ebene
  let angle = v_angle(m[1], v2); // Rotations Winkel
  if (v_angle(m[0], v2) >= Math.PI/2) {
    angle = Math.PI*2 - angle;
  }
  let r = h * v_angle(m[2], vector) / bildwinkel_v;
  let x = Math.round((cw-(Math.round(w / 2 + (r * Math.sin(angle)))-(w-cw)/2))*10)/10;
  let y = Math.round((Math.round(h / 2 - (r * Math.cos(angle)))-(h-ch)/2)*10)/10;
  // roth = v_angle(m[2], vector);
  return [x, y];
}

//render loop
function renderLoop() {
  let near = [];

  // höhe verändern
  if (alti_ist != alti_soll) {
    if(alti_ist > alti_soll) {
      alti_ist -= inc;
    } else if (alti_ist < alti_soll) {
      alti_ist += inc;
    }

    console.log(alti_ist);
  }

  let m = mToV(getRotationMatrix(alpha, beta, gamma)); // Rothationsmatrix aus Winkeln erstellen

  // map
  let map_v = v_min(m[2], mult([0,0,1], scalar(m[2], [0,0,1]))); // Projezierter Richtungsvektor auf x-y Ebene
  let map_angle = v_angle([0,1,0], map_v);
  if (v_angle([1,0,0], map_v) <= Math.PI/2) {
    map_angle = Math.PI*2 - map_angle;
  }
  document.getElementById("location").style.transform = "rotate("+Math.round(radToDeg(map_angle)*10)/10+"deg)";

  // objects
  for (let i = 0; i < objects.length; i++) {
    let v1 = [objects[i].latitude, objects[i].longitude, objects[i].altitude]; // Vektor zum Objekt
    if (objects[i]["id"].split("-")[1] == "lokal") {
      let l_n_vector = v_len(v1);
    } else {
      let l_n_vector = v_len(gerV([device_latitude, device_longitude, device_altitude], v1));
    }
    if (l_n_vector > r_zoom) {
      if (document.getElementById(objects[i]["id"])) {
        document.getElementById(objects[i]["id"]).remove();
      }
      continue;
    }

    let xy = d_pos(m, gerV([device_latitude, device_longitude, device_altitude+alti_ist], v1));
    if (xy[0] >= 0 && xy[0] <= cw && xy[1] >= 0 && xy[1] <= ch) {
      let entf = Math.sqrt(Math.pow(cw / 2 - xy[0], 2) + Math.pow(ch / 2 - xy[1], 2));
      if (entf < oh/2) {
        near.push(objects[i]["id"])
      }

      // let ngroesse = 50
      // groesse = ngroesse * Math.pow(Math.E, -Math.pow((4 * entf) / (6 * ngroesse), 2)) + ngroesse;
      let width;
      let index;
      // let groesse = (Math.pow(0.995, l_n_vector)*10 +10)/20 * oh;
      if (oldx !== objects[i]["id"]) {
        index = Math.round(-l_n_vector);
        width = oh; //groesse;
        // height = groesse;
      } else {
        index = 2;
        width = ow;
        // height = oh;
      }
      create(objects[i], xy[0], xy[1], width, Math.round(l_n_vector), 0, index)
    } else {
      if (document.getElementById(objects[i]["id"])) {
        document.getElementById(objects[i]["id"]).remove();
      }
    }
  }

  // terrain
  xy = d_pos(m, [0, 0, -1]);
  document.getElementById("terrain").setAttribute('style', "right: "+xy[0]+"px; top: "+xy[1]+"px;");

  map_v = v_min(m[1], mult([0,0,1], scalar(m[1], [0,0,1]))); // Projezierter Richtungsvektor auf x-y Ebene
  map_angle = v_angle([0,1,0], map_v);
  if (v_angle([1,0,0], map_v) <= Math.PI/2) {
    map_angle = Math.PI*2 - map_angle;
  }
  document.getElementById("terrain").style.transform = "translate(50%, -50%) rotate("+Math.round(radToDeg(map_angle)*10)/10+"deg)"

  let dis = [];
  for (let i = 0; i < near.length; i++) {
      dis.push(parseInt(document.getElementById(near[i]).style.zIndex, 10))
  }
  oldx = "";
  if (dis.length !== 0) {
    oldx = near[dis.indexOf(Math.max(...dis))];
  }

  if (d_orientation) {
    requestAnimationFrame(renderLoop);
  }
}

/*
  Copyright © 2020 Karl Henning
*/

/*

var stream;
if (location.protocol == "https:") {
  var video = document.getElementById('video-stream');

  var constraints = {
    audio: false,
    video: {
      facingMode: "environment",
      frameRate: {max: 60, min: 30}
    }
  }

  navigator.mediaDevices.getUserMedia(constraints)
    .then(function(stream) {
      var videoTracks = stream.getVideoTracks();
      console.log('Got stream with constraints:', constraints);
      console.log('Using video device: ' + videoTracks[0].label);
      stream.onremovetrack = function() {
        console.log('Stream ended');
      };
      window.stream = stream; // make variable available to browser console
      video.srcObject = stream;


    })
    .catch(function(error) {
      if (error.name === 'PermissionDeniedError') {
        alert('Permissions have not been granted to use your camera and ' +
          'microphone, you need to allow the page access to your devices in ' +
          'order for the demo to work.');
      } else if (error.name === 'NotAllowedError') {
        alert("User denied the request for camera.")
      } else {
        alert(error.name +": "+error);
      }
    });
} else {
  location.href = "https://"+location.hostname;
}
*/
var stream;
const videoElement = document.getElementById('video-stream');
const videoSelect = document.getElementById('videoSource');
const selectors = [videoSelect];


function gotDevices(deviceInfos) {
  // Handles being called several times to update labels. Preserve values.
  const values = selectors.map(select => select.value);
  selectors.forEach(select => {
    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
  });
  for (let i = 0; i !== deviceInfos.length; ++i) {
    const deviceInfo = deviceInfos[i];
    const option = document.createElement('option');
    option.value = deviceInfo.deviceId;
    if (deviceInfo.kind === 'audioinput') {
      continue;
    } else if (deviceInfo.kind === 'audiooutput') {
      continue;
    } else if (deviceInfo.kind === 'videoinput') {
      option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
      videoSelect.appendChild(option);
    } else {
      console.log('Some other kind of source/device: ', deviceInfo);
    }
  }
  selectors.forEach((select, selectorIndex) => {
    if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
      select.value = values[selectorIndex];
    }
  });
}

navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError);

var ac = false;
function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoElement.srcObject = stream;
  // Refresh button list in case labels have become available
  return navigator.mediaDevices.enumerateDevices();

  if (!ac) {
    // start ar
    console.log("start");
    start()
    ac = true;
  }
}

function handleError(error) {
  if (error.name === 'PermissionDeniedError') {
    alert('Permissions have not been granted to use your camera and ' +
      'microphone, you need to allow the page access to your devices in ' +
      'order for the demo to work.');
  } else if (error.name === 'NotAllowedError') {
    alert("User denied the request for camera.")
  } else {
    alert(error.name +": "+error.message);
  }
}

function start_stream() {
  if (window.stream) {
    window.stream.getTracks().forEach(track => {
      track.stop();
    });
  }
  const videoSource = videoSelect.value;
  const constraints = {
    audio: false,
    video: {
      facingMode: "environment",
      deviceId: videoSource ? {exact: videoSource} : undefined,
      frameRate: {max: 60, min: 30}
    }
  };
  navigator.mediaDevices.getUserMedia(constraints).then(gotStream).then(gotDevices).catch(handleError);
}

videoSelect.onchange = start_stream;

start_stream();

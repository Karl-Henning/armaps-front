/*
  Copyright © 2020 Karl Henning
*/

function getElevation(object, aCallback) {
  getURL(apiUrl + 'elevation?point=' + object["geometry"]["location"]["lat"] + ',' + object["geometry"]["location"]["lng"], function(response) {
    var object_altitude = JSON.parse(response)['results'][0]['elevation']+2; // TODO: edit java web-api
    aCallback({
      "origin": "maps",
      "id": object["place_id"],
      "latitude": object["geometry"]["location"]["lat"],
      "longitude": object["geometry"]["location"]["lng"],
      "altitude": object_altitude,
      "icon": object["icon"],
      "data": {
        "name": object["name"],
        "address": object["vicinity"]
      }
    });
  });
}


var objectData;

function connectToDB(db, version, onupgradeneeded, onsuccess) {
  var openRequest = indexedDB.open(db, version);
  openRequest.onupgradeneeded = function(e) {
    db = e.target.result;
    onupgradeneeded(db)
  };
  openRequest.onsuccess = function(e) {
    db = e.target.result;
    onsuccess(db);
    db.close();
  };
  openRequest.onerror = function(e) {
    console.log("connectToDB Error!", "DB: " + db.name + ", version: " + version, e);
  };
}

function addItem(db, store, item) {
  var transaction = db.transaction(store, 'readwrite');
  store = transaction.objectStore(store);
  var request = store.add(item);
  request.onsuccess = function(e) {
    // console.log("Item added!", "DB: " + db.name + ", store: " + store.name, item);
  };
  request.onerror = function(e) {
    // console.error("addItem Error!", "DB: " + db.name + ", store: " + store, e);
  };
}

function getItem(db, store, key, onsuccess) {
  var transaction = db.transaction(store, 'readwrite');
  store = transaction.objectStore(store);
  var request = store.get(key);
  request.onsuccess = function(e) {
    onsuccess(e["srcElement"]["result"])
    // console.log("Item added!", "DB: " + db.name + ", store: " + store.name, item);
  };
  request.onerror = function(e) {
    // console.error("addItem Error!", "DB: " + db.name + ", store: " + store, e);
  };
}

function getAll(db, store, onsuccess) {
  var tx = db.transaction(store, 'readonly');
  store = tx.objectStore(store);
  var request = store.getAll();
  request.onsuccess = function(e) {
    onsuccess(request["result"])
  };
  request.onerror = function(e) {
    console.error("getAll Error!", "DB: " + db + ", store: " + store, e);
  };
}

function distance(lat1, lat2, lng1, lng2) {
  var R = 6371e3; // metres
  lat1 = degToRad(lat1);
  lat2 = degToRad(lat2);
  var dlat = degToRad((lat2 - lat1));
  var dl = degToRad((lng2 - lng1));

  var a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dl / 2) * Math.sin(dl / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function remove(array, element) {
  return array.filter(e => e !== element);
}


// final function
function intoObjArr(type, bolean) {
  connectToDB('type_links', localStorage.type_links_version, function(db) {
    console.log("on chage -links");
  }, function(db) {
    getAll(db, type, function(data) {
      if (data.length !== 0) {
        // remove objects from array
        connectToDB('objects', 1, function(db) {
          if (!db.objectStoreNames.contains("maps")) {
            var storeOS = db.createObjectStore("maps", {
              "keyPath": 'id'
            });
          }
        }, function(db) {
          for (var i = 0; i < data.length; i++) {
            getItem(db, data[i]["orgin"], data[i]["id"], function(object) {
              if (bolean) {
                object["circle"] = new google["maps"]["Circle"]({
                  "strokeColor": '#FF0000',
                  "strokeOpacity": 0.8,
                  "strokeWeight": 2,
                  "fillColor": '#FF0000',
                  "fillOpacity": 0.35,
                  "map": map,
                  "center": {"lat": object["latitude"], "lng": object["longitude"]},
                  "radius": 20
                });
                objects.push(object)
              } else {
                for (var i = 0; i < objects.length; i++) {
                  objects[i]["circle"]["setMap"](null);
                  if (objects[i]["id"] === object["id"]) {
                    objects.splice(i, 1);
                  }
                }
                try {
                  document.getElementById(object["id"]).remove();
                } catch (object) {
                  console.log("not displayed");
                }
              }
            })
          }
        })
      }
    })
  })
}

function reload(type, displayed, objects_types) {
  connectToDB('type_links', localStorage.type_links_version, function(db) {
    for (var i = 0; i < objects_types.length; i++) {
      if (!db.objectStoreNames.contains(objects_types[i])) {
        var storeOS = db.createObjectStore(objects_types[i], {
          "keyPath": 'id'
        });
      }
    }
  }, function(db) {
    objects_types = [];
    var added = false;
    if (!db.objectStoreNames.contains(type)) {
      objects_types.push(type);
      added = true;
    }
    for (var i = 0; i < objectData.length; i++) { // optimirtbar
      console.log(objectData, i, objectData[i]);
      for (var a = 0; a < objectData[i]["types"].length; a++) {
        var types = objectData[i]["types"][a];
        if (db.objectStoreNames.contains(types)) {
          addItem(db, types, {
            "id": objectData[i]["place_id"],
            "orgin": "maps"
          })
        } else {
          if (!objects_types.includes(types)) {
            objects_types.push(types);
            added = true;
          }
        }
      }
    }
    if (added) {
      added = false;
      localStorage.type_links_version = Number(localStorage.type_links_version) + 1;
      reload(type, displayed, objects_types)
    } else if (objectData.length === 0) {} else {
      intoObjArr(type, displayed)
    }
  })
}

function getNewData(type, displayed) {
  console.log("Download...");
  if (type === "stolpersteine") {
    objectData = [{'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-PPAOlZdHBIDZHJNxeizZ', 'altitude': 113.9, 'latitude': 51.7540187, 'longitude': 11.4564366, 'data': {'address': 'Breite Straße 15', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Aschersleben_Breite_Stra%C3%9Fe_15_%2801%29.jpg/150px-Aschersleben_Breite_Stra%C3%9Fe_15_%2801%29.jpg'}, 'extra': [{'name': 'Adolf Conitzer', 'lived': '1866–1943', 'biography': 'Adolf Conitzer stammte aus Jeschewo. Gemeinsam mit Arthur Grünbaum betrieb er in Aschersleben ein Kaufhaus. 1942 wurde er ins Ghetto Theresienstadt deportiert und starb dort am 1. Februar 1943.', 'date': '19.\xa0Nov. 2009', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Aschersleben_Breite_Stra%C3%9Fe_12_Stolperstein_Conitzer%2C_Adolf.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_12_Stolperstein_Conitzer%2C_Adolf.jpg'}}, {'name': 'Arthur Grünbaum', 'lived': '1872–1938', 'biography': 'Arthur Grünbaum betrieb gemeinsam mit Adolf Conitzer in Aschersleben ein Kaufhaus. Er kam 1938 in Berlin ums Leben.', 'date': '19.\xa0Nov. 2009', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Aschersleben_Breite_Stra%C3%9Fe_12_Stolperstein_Gr%C3%BCnbaum%2C_Arthur.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_12_Stolperstein_Gr%C3%BCnbaum%2C_Arthur.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-fOGfZNtSmFCKRWOVrrZr', 'altitude': 113.0, 'latitude': 51.75389999999999, 'longitude': 11.4571736, 'data': {'address': 'Breite Straße 39', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Aschersleben_Breite_Stra%C3%9Fe_39_%2801%29.jpg/150px-Aschersleben_Breite_Stra%C3%9Fe_39_%2801%29.jpg'}, 'extra': [{'name': 'Betty Wolff', 'lived': '1886–1940', 'date': '9.\xa0Nov. 2018', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Aschersleben_Breite_Stra%C3%9Fe_15_Stolperstein_Wolff%2C_Betty.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_15_Stolperstein_Wolff%2C_Betty.jpg'}}, {'name': 'Max Wolff', 'lived': '1875–1943', 'date': '9.\xa0Nov. 2018', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Aschersleben_Breite_Stra%C3%9Fe_15_Stolperstein_Wolff%2C_Max.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_15_Stolperstein_Wolff%2C_Max.jpg'}}, {'name': 'Selly Wolff', 'lived': '1915–?', 'date': '9.\xa0Nov. 2018', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Aschersleben_Breite_Stra%C3%9Fe_15_Stolperstein_Wolff%2C_Selly.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_15_Stolperstein_Wolff%2C_Selly.jpg'}}, {'name': 'Walter Wolff', 'lived': '1913–?', 'date': '9.\xa0Nov. 2018', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Aschersleben_Breite_Stra%C3%9Fe_15_Stolperstein_Wolff%2C_Walter.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_15_Stolperstein_Wolff%2C_Walter.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-wVreCSwmGwgPXoUerHbN', 'altitude': 113.9, 'latitude': 51.75447339999999, 'longitude': 11.455985, 'data': {'address': 'Breite Straße 41a', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Aschersleben_Breite_Stra%C3%9Fe_41a.jpg/150px-Aschersleben_Breite_Stra%C3%9Fe_41a.jpg'}, 'extra': [{'name': 'Bertha Badt', 'lived': '1859–1942', 'biography': 'Bertha geb. Sternberg war mit Max Badt verheiratet und hatte mit ihm vier Kinder. Eine Tochter starb bereits sehr jung. Ein Sohn zog nach Berlin, ein weiterer Sohn und eine Tochter wanderten Anfang der 1930er Jahre nach Palästina aus. Nachdem für die Eheleute ein Leben in ihrer Heimatstadt nicht mehr möglich war, zogen sie zu ihrem Sohn nach Berlin. 1942 wurden sie zunächst ins Ghetto Theresienstadt und später in ein Todeslager deportiert. Bertha Badt wurde am 8. Dezember 1942 ermordet.', 'date': '30.\xa0Jul. 2012', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Aschersleben_Breite_Stra%C3%9Fe_39_Stolperstein_Badt%2C_Bertha.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_39_Stolperstein_Badt%2C_Bertha.jpg'}}, {'name': 'Max Badt', 'lived': '1856–1942', 'biography': 'Max Badt betrieb in Aschersleben eine Lederwarenhandlung. Nachdem für ihn und seine Frau Bertha ein Leben in ihrer Heimatstadt nicht mehr möglich war, zogen beide zu ihrem Sohn nach Berlin. 1942 wurden sie zunächst ins Ghetto Theresienstadt und später in ein Todeslager deportiert. Max Badt wurde am 16. November 1942 ermordet.', 'date': '30.\xa0Jul. 2012', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Aschersleben_Breite_Stra%C3%9Fe_39_Stolperstein_Badt%2C_Max.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_39_Stolperstein_Badt%2C_Max.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-zXDEVhgYBJxjJepTpuyu', 'altitude': 114.3, 'latitude': 51.7546847, 'longitude': 11.4555429, 'data': {'address': 'Douglasstraße 2a', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Aschersleben_Douglasstra%C3%9Fe_2a.jpg/150px-Aschersleben_Douglasstra%C3%9Fe_2a.jpg'}, 'extra': [{'name': 'Alice Crohn', 'lived': '1878–1944', 'biography': 'Alice geb. Samson wurde in Bernburg geboren und betrieb mit ihrem Mann Herman Crohn in Aschersleben ein Kaufhaus. Das Ehepaar hatte vier Töchter, darunter Käthe Hirsch geb. Crohn und Lilli Silberberg geb. Crohn. Nach dem Tod ihres Mannes führte Alice Crohn das Kaufhaus gemeinsam mit dem Ehepaar Feodor und Helene Hirsch. Alice Crohn und Käthe Hirsch wurden 1942 deportiert. Alice Crohn gelangte zunächst ins Ghetto Theresienstadt. Später wurde sie ins KZ Auschwitz verlegt, wo sie am 16. Mai 1944 ermordet wurde. Auch Käthe Hirsch und Lilli Silberberg überlebten den Krieg nicht. Den beiden anderen Töchtern von Alice Crohn gelang die Flucht nach Südafrika bzw. Palästina.', 'date': '10.\xa0Jun. 2011', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Crohn%2C_Alice.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Crohn%2C_Alice.jpg'}}, {'name': 'Feodor Hirsch', 'lived': '1888–1970', 'biography': 'Feodor Hirsch musste ab 1938 Zwangsarbeit in einem Lager verrichten. Anfang 1945 gelang ihm die Flucht. Bis zur Befreiung Ascherslebens durch amerikanische Truppen hielt er sich versteckt. Nach Kriegsende kehrte er in seinen alten Beruf zurück.', 'date': '29.\xa0Okt. 2010', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Hirsch%2C_Feodor.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Hirsch%2C_Feodor.jpg'}}, {'name': 'Käte Hirsch', 'lived': '1905–?', 'biography': 'Käte Hirsch war die Tochter von Herman und Alice Crohn. Sie und ihre Mutter wurden 1942 deportiert. Käte Hirsch musste Zwangsarbeit in einem Arbeitslager in Warschau verrichten. Ihr weiteres Schicksal ist unbekannt.\n', 'date': '10.\xa0Jun. 2011', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Hirsch%2C_K%C3%A4te.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Hirsch%2C_K%C3%A4te.jpg'}}, {'name': 'Lilli Silberberg', 'lived': '1909–1944', 'biography': 'Lilli Silberberg war die Tochter von Herman und Alice Crohn. Sie wurde 1944 nach Auschwitz deportiert und ermordet.', 'date': '10.\xa0Jun. 2011', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Silberberg%2C_Lilli.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Silberberg%2C_Lilli.jpg'}}, {'name': 'Stephan Silberberg', 'lived': '1934–1944', 'biography': 'Stephan Silberberg wurde 1944 mit seiner Mutter und seinem Bruder nach Auschwitz deportiert und dort ermordet.', 'date': '30.\xa0Jul. 2015', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Silberberg%2C_Stephan.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Silberberg%2C_Stephan.jpg'}}, {'name': 'Thomas Silberberg', 'lived': '1938–1944', 'biography': 'Thomas Silberberg wurde 1944 mit seiner Mutter und seinem Bruder nach Auschwitz deportiert und dort ermordet.', 'date': '30.\xa0Jul. 2015', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Silberberg%2C_Thomas.jpg/160px-Aschersleben_Breite_Stra%C3%9Fe_41a_Stolperstein_Silberberg%2C_Thomas.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-YOCiSqDsClfaYqgIBAGQ', 'altitude': 118.3, 'latitude': 51.75804, 'longitude': 11.45577, 'data': {'address': 'Dr.-Wilhelm-Külz-Platz 8', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8.jpg/150px-Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8.jpg'}, 'extra': [{'name': 'Dora Gerson', 'lived': '1884–1941', 'biography': 'Dora Gerson studierte Medizin und arbeitete in Köln als Assistenzärztin und später in Dresden als Oberärztin. 1935 wurde ihr die Arbeitserlaubnis entzogen. 1941 wählte sie den Freitod.', 'date': '19.\xa0Dez. 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Aschersleben_Douglasstra%C3%9Fe_2a_Stolperstein_Gerson%2C_Dr._Dora.jpg/160px-Aschersleben_Douglasstra%C3%9Fe_2a_Stolperstein_Gerson%2C_Dr._Dora.jpg'}}, {'name': 'Rudolf Gerson', 'lived': '1890–1938', 'biography': 'Rudolf Gerson diente im Ersten Weltkrieg und studierte anschließend Jura. Er war verheiratet und hatte eine Tochter. Bis zu seiner Entlassung 1935 arbeitete er als Amtsgerichtsrat. 1938 wurde er verhaftet und ins KZ Buchenwald deportiert, wo er nach zehn Tagen Haft ermordet wurde. Seine Frau und seine Tochter überlebten den Krieg.', 'date': '19.\xa0Dez. 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Aschersleben_Douglasstra%C3%9Fe_2a_Stolperstein_Gerson%2C_Rudolf.jpg/160px-Aschersleben_Douglasstra%C3%9Fe_2a_Stolperstein_Gerson%2C_Rudolf.jpg'}}, {'name': 'Luise Hagedorn', 'lived': '1886–1975', 'biography': 'Luise Hagedorn geb. Gerson diente im Ersten Weltkrieg als Krankenschwester. Sie war mit dem aus Staßfurt stammenden Bankbeamten Fritz Hagedorn verheiratet und zog mit ihm nach Hannover. Dort überlebte sie versteckt bis zum Ende des Krieges. Später zog sie nach Nürnberg, wo sie 1975 starb.', 'date': '19.\xa0Dez. 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Aschersleben_Douglasstra%C3%9Fe_2a_Stolperstein_Hagedorn%2C_Luise.jpg/160px-Aschersleben_Douglasstra%C3%9Fe_2a_Stolperstein_Hagedorn%2C_Luise.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-qEwiFwtLCXEveaaNVRdx', 'altitude': 113.2, 'latitude': 51.7528006, 'longitude': 11.4588339, 'data': {'address': 'Dr.-Wilhelm-Külz-Platz 16', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/StephaneumASL.JPG/160px-StephaneumASL.JPG'}, 'extra': [{'name': 'Sidonie Lewin', 'lived': '1876–1942?', 'biography': 'Sidonie Lewin wurde 1942 zusammen mit dem Großteil ihrer Familie ins Warschauer Ghetto deportiert, wo vermutlich alle kurze Zeit später umkamen.', 'date': '6.\xa0Mai 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Lewin%2C_Sidonie.jpg/160px-Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Lewin%2C_Sidonie.jpg'}}, {'name': 'Elfriede Spanier', 'lived': '1903–1942?', 'biography': 'Elfriede Spanier wurde 1942 zusammen mit dem Großteil ihrer Familie ins Warschauer Ghetto deportiert, wo vermutlich alle kurze Zeit später umkamen.', 'date': '6.\xa0Mai 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Elfriede.jpg/160px-Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Elfriede.jpg'}}, {'name': 'Henny Spanier', 'lived': '1881–1942?', 'biography': 'Henny Spanier stammte aus Groebzig. Sie war verwitwet und lebte mit ihren Kindern in Aschersleben. 1942 wurde der Großteil der Familie ins Warschauer Ghetto deportiert, wo vermutlich alle kurze Zeit später umkamen.', 'date': '6.\xa0Mai 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Henny.jpg/160px-Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Henny.jpg'}}, {'name': 'Otto Spanier', 'lived': '1868–1943', 'biography': 'Otto Spanier wurde am 18. November 1942 ins Ghetto Theresienstadt deportiert, wo er am 18. März 1943 starb.', 'date': '6.\xa0Mai 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Otto.jpg/160px-Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Otto.jpg'}}, {'name': 'Ruth Spanier', 'lived': '1906–1942?', 'biography': 'Ruth Spanier wurde 1942 zusammen mit dem Großteil ihrer Familie ins Warschauer Ghetto deportiert, wo vermutlich alle kurze Zeit später umkamen.', 'date': '6.\xa0Mai 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Ruth.jpg/160px-Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Ruth.jpg'}}, {'name': 'Walter Spanier', 'lived': '1905–1942?', 'biography': 'Walter Spanier wurde 1942 zusammen mit dem Großteil seiner Familie ins Warschauer Ghetto deportiert, wo vermutlich alle kurze Zeit später umkamen.', 'date': '6.\xa0Mai 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Walter.jpg/160px-Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_Walter.jpg'}}, {'name': 'William Salomon Spanier', 'lived': '1937–1942?', 'biography': 'William Salomon Spanier wurde 1942 zusammen mit dem Großteil seiner Familie ins Warschauer Ghetto deportiert, wo vermutlich alle kurze Zeit später umkamen.', 'date': '6.\xa0Mai 2013', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_William_Salomon.jpg/160px-Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_8_Stolperstein_Spanier%2C_William_Salomon.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-YhSOsiGBZsUsmzuFkCKJ', 'altitude': 111.5, 'latitude': 51.75203, 'longitude': 11.45879, 'data': {'address': 'Herrenbreite 9', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Aschersleben_Herrenbreite_9.jpg/150px-Aschersleben_Herrenbreite_9.jpg'}, 'extra': [{'name': 'Hans-Gideon Hirschfeld', 'lived': '1921–?', 'biography': 'Hans-Gideon Hirschfeld wurde in Berlin geboren und besuchte in Aschersleben das Stephaneum. 1935 musste er vorzeitig die Schule verlassen. Mit seinen Eltern und seiner jüngeren Schwester floh er über Triest nach Palästina. Dort starb Hans-Gideon Hirschfeld noch in jungen Jahren nach schwerer Krankheit.', 'date': '23.\xa0Nov. 2008', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_16_Stephaneum_Stolperstein_Hirschfeld%2C_Hans_Gideon.jpg/160px-Aschersleben_Dr.-Wilhelm-K%C3%BClz-Platz_16_Stephaneum_Stolperstein_Hirschfeld%2C_Hans_Gideon.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-XicpBFKpqifWPRbSEShe', 'altitude': 115.6, 'latitude': 51.7567337, 'longitude': 11.4603848, 'data': {'address': 'Hinter dem Turm 1', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Aschersleben_Hinter_dem_Turm_1.jpg/150px-Aschersleben_Hinter_dem_Turm_1.jpg'}, 'extra': [{'name': 'Clara Kohsen', 'lived': '1868–1941', 'date': '29.\xa0Sep. 2016', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Aschersleben_Herrenbreite_9_Stolperstein_Kohsen%2C_Clara.jpg/160px-Aschersleben_Herrenbreite_9_Stolperstein_Kohsen%2C_Clara.jpg'}}, {'name': 'Julius Kohsen', 'lived': '1866–1942', 'biography': 'Julius Kohsen arbeitete als Bankier. Gemeinsam mit seinem Bruder Otto beging er vor der drohenden Deportation in ein Konzentrationslager Suizid.', 'date': '29.\xa0Sep. 2016', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Aschersleben_Herrenbreite_9_Stolperstein_Kohsen%2C_Julius.jpg/160px-Aschersleben_Herrenbreite_9_Stolperstein_Kohsen%2C_Julius.jpg'}}, {'name': 'Otto Kohsen', 'lived': '1867–1941', 'biography': 'Otto Kohsen arbeitete als Bankier. Gemeinsam mit seinem Bruder Julius beging er vor der drohenden Deportation in ein Konzentrationslager Suizid.', 'date': '29.\xa0Sep. 2016', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Aschersleben_Herrenbreite_9_Stolperstein_Kohen%2C_Otto.jpg/160px-Aschersleben_Herrenbreite_9_Stolperstein_Kohen%2C_Otto.jpg'}}, {'name': 'Henriette Steinberg', 'lived': '1896–?', 'date': '29.\xa0Sep. 2016', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Aschersleben_Herrenbreite_9_Stolperstein_Steinberg%2C_Henriette.jpg/160px-Aschersleben_Herrenbreite_9_Stolperstein_Steinberg%2C_Henriette.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-GvaYLKnaikqViZLUBPaD', 'altitude': 116.4, 'latitude': 51.7549997, 'longitude': 11.4550886, 'data': {'address': 'Johannispromenade 3', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Aschersleben_Johannispromenade_3.jpg/150px-Aschersleben_Johannispromenade_3.jpg'}, 'extra': [{'name': 'Lotti Becker', 'lived': '1905–ca. 1943', 'biography': 'Lotti Beckers Pläne, ihrer Familie in die Emigration nach Südafrika zu folgen, verzögerten sich zunächst und wurden schließlich durch den Kriegsausbruch zerschlagen. Am 13. April 1942 wurden sie und ihre Tochter über Magdeburg ins Ghetto Warschau deportiert. Von dort wurden sie im Sommer 1943 verschleppt und an einem unbekannten Ort ermordet.', 'date': '30.\xa0Jul. 2015', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Becker%2C_Lotti.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Becker%2C_Lotti.jpg'}}, {'name': 'Marion Becker', 'lived': '1925–ca. 1943', 'biography': 'Marion Becker wurde in Danzig geboren. Sie wurde am 13. April 1942 gemeinsam mit ihrer Mutter über Magdeburg ins Ghetto Warschau deportiert. Von dort wurden sie im Sommer 1943 verschleppt und an einem unbekannten Ort ermordet.', 'date': '30.\xa0Jul. 2015', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Becker%2C_Marion.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Becker%2C_Marion.jpg'}}, {'name': 'Cäcilie Bry', 'lived': '1877–?', 'biography': 'Cäcilie Bry konnte 1939 mit ihrem Mann zu den Kindern nach Südafrika emigrieren.', 'date': '30.\xa0Jul. 2015', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_C%C3%A4cilie.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_C%C3%A4cilie.jpg'}}, {'name': 'Erich Bry', 'lived': '1907–?', 'biography': 'Erich Bry emigrierte 1935 zunächst in die Tschechoslowakei und im folgenden Jahr nach Südafrika.', 'date': '30.\xa0Jul. 2015', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_Erich.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_Erich.jpg'}}, {'name': 'Moritz Bry', 'lived': '1874–?', 'biography': 'Moritz Bry betrieb in Aschersleben ein Geschäft, dass er 1938 zwangsverkaufen musste. Im folgenden Jahr konnten er und seine Frau zu ihren Kindern nach Südafrika emigrieren.', 'date': '30.\xa0Jul. 2015', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_Moritz.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_Moritz.jpg'}}, {'name': 'Ilse Bry verh. Engehausen', 'lived': '1911–?', 'biography': 'Ilse Engehausen emigrierte 1935 nach Südafrika.', 'date': '30.\xa0Jul. 2015', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_Ilse.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_Ilse.jpg'}}, {'name': 'Käte Keibel geb. Bry', 'lived': '1909–?', 'biography': 'Käte Keibel emigrierte 1935 nach Südafrika.', 'date': '30.\xa0Jul. 2015', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_K%C3%A4te.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Bry%2C_K%C3%A4te.jpg'}}, {'name': 'Sophie Kirk', 'lived': '1917–ca. 2004', 'biography': 'Sophie Singer konnte 1938 nach England emigrieren.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Kirk%2C_Sophie.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Kirk%2C_Sophie.jpg'}}, {'name': 'Egon Werner Singer', 'lived': '1935–ca. 1942', 'biography': 'Egon Werner Singer wurde in Göttingen geboren und am 29. November 1942 von Berlin aus ins Vernichtungslager Auschwitz deportiert, wo er ermordet wurde.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Singer%2C_Egon_Werner.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Singer%2C_Egon_Werner.jpg'}}, {'name': 'Berta Tworoger', 'lived': '1911–?', 'biography': 'Berta Tworoger stammte aus Polen und arbeitete als Haushälterin in Den Haag und Leipzig. 1942 wurde sie mit ihrem Mann und ihren Kindern ins Ghetto Warschau deportiert. Ihr weiteres Schicksal ist unbekannt.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Tworoger%2C_Berta.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Tworoger%2C_Berta.jpg'}}, {'name': 'Ludwig Tworoger', 'lived': '1907–?', 'biography': 'Ludwig Tworoger wurde 1942 gemeinsam mit seiner Frau und den beiden Kindern ins Ghetto Warschau deportiert. Sein weiteres Schicksal ist unbekannt.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Tworoger%2C_Ludwig.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Tworoger%2C_Ludwig.jpg'}}, {'name': 'Manfred Tworoger', 'lived': '1937–?', 'biography': 'Manfred Tworoger wurde 1942 gemeinsam mit seinen Eltern und seiner Schwester ins Ghetto Warschau deportiert. Sein weiteres Schicksal ist unbekannt.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Tworoger%2C_Manfred.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Tworoger%2C_Manfred.jpg'}}, {'name': 'Ruth Tworoger', 'lived': '1941–?', 'biography': 'Ruth Tworoger wurde 1942 gemeinsam mit ihren Eltern und ihrem Bruder ins Ghetto Warschau deportiert. Ihr weiteres Schicksal ist unbekannt.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Aschersleben_Hinter_dem_Turm_1_Stolperstein_Tworoger%2C_Ruth.jpg/160px-Aschersleben_Hinter_dem_Turm_1_Stolperstein_Tworoger%2C_Ruth.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-oaVqynvnofhLoKtvqMfd', 'altitude': 116.3, 'latitude': 51.7571151, 'longitude': 11.4598044, 'data': {'address': 'Jüdendorf 12', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Aschersleben_J%C3%BCdendorf_12.jpg/150px-Aschersleben_J%C3%BCdendorf_12.jpg'}, 'extra': [{'name': 'Anna Bamberger', 'lived': '1866–1942', 'biography': 'Anna Bamberger wurde in Berlin geboren. Von Aschersleben wurde sie am 18. November 1942 über Magdeburg ins Ghetto Theresienstadt deportiert, wo sie bereits am 4. Dezember 1942 starb.', 'date': '29.\xa0Sep. 2016', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Aschersleben_Johannispromenade_3_Stolperstein_Bamberger%2C_Anna.jpg/160px-Aschersleben_Johannispromenade_3_Stolperstein_Bamberger%2C_Anna.jpg'}}, {'name': 'Gertrud Cahn', 'lived': '1900–?', 'biography': 'Gertrud Cahn war Pianistin. Sie war die Nichte von Anna Bamberger. Mit ihrem Mann und den beiden Söhnen emigrierte sie nach Amerika.', 'date': '29.\xa0Sep. 2016', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Aschersleben_Johannispromenade_3_Stolperstein_Cahn%2C_Gertrud.jpg/160px-Aschersleben_Johannispromenade_3_Stolperstein_Cahn%2C_Gertrud.jpg'}}, {'name': 'Robert Cahn', 'lived': '1933–?', 'biography': 'Robert war der Sohn von Gertrud und Wolfgang Cahn. Mit seinen Eltern und seinem Bruder emigrierte er nach Amerika.', 'date': '29.\xa0Sep. 2016', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Aschersleben_Johannispromenade_3_Stolperstein_Cahn%2C_Robert.jpg/160px-Aschersleben_Johannispromenade_3_Stolperstein_Cahn%2C_Robert.jpg'}}, {'name': 'Walter Cahn', 'lived': '1895–?', 'biography': 'Walter war der Sohn von Gertrud und Wolfgang Cahn. Mit seinen Eltern und seinem Bruder emigrierte er nach Amerika.', 'date': '29.\xa0Sep. 2016', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Aschersleben_Johannispromenade_3_Stolperstein_Cahn%2C_Dr._Walter.jpg/160px-Aschersleben_Johannispromenade_3_Stolperstein_Cahn%2C_Dr._Walter.jpg'}}, {'name': 'Wolfgang Cahn', 'lived': '1931–?', 'biography': 'Wolfgang Cahn war Arzt. Er emigrierte mit seiner Frau und den beiden Söhnen nach Amerika.', 'date': '29.\xa0Sep. 2016', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Aschersleben_Johannispromenade_3_Stolperstein_Cahn%2C_Wolfgang.jpg/160px-Aschersleben_Johannispromenade_3_Stolperstein_Cahn%2C_Wolfgang.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-DwQPfKWKkwoMoQDbmOYH', 'altitude': 115.6, 'latitude': 51.7540635, 'longitude': 11.4523641, 'data': {'address': 'Leopoldstraße 1', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Aschersleben_Leopoldstra%C3%9Fe_1.jpg/150px-Aschersleben_Leopoldstra%C3%9Fe_1.jpg'}, 'extra': [{'name': 'Elfriede Messingrau', 'lived': '1925–?', 'date': '4.\xa0Sep. 2017', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Aschersleben_J%C3%BCdendorf_12_Stolperstein_Messinggrau%2C_Elfriede.jpg/160px-Aschersleben_J%C3%BCdendorf_12_Stolperstein_Messinggrau%2C_Elfriede.jpg'}}, {'name': 'Jacob Theodor Messingrau', 'lived': '1888–?', 'date': '4.\xa0Sep. 2017', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Aschersleben_J%C3%BCdendorf_12_Stolperstein_Messinggrau%2C_Jacob_Theodor.jpg/160px-Aschersleben_J%C3%BCdendorf_12_Stolperstein_Messinggrau%2C_Jacob_Theodor.jpg'}}, {'name': 'Karoline Messingrau', 'lived': '1899–?', 'date': '4.\xa0Sep. 2017', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Aschersleben_J%C3%BCdendorf_12_Stolperstein_Messinggrau%2C_Karoline.jpg/160px-Aschersleben_J%C3%BCdendorf_12_Stolperstein_Messinggrau%2C_Karoline.jpg'}}, {'name': 'Manfred Messingrau', 'lived': '1921–?', 'date': '4.\xa0Sep. 2017', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Aschersleben_J%C3%BCdendorf_12_Stolperstein_Messinggrau%2C_Manfred.jpg/160px-Aschersleben_J%C3%BCdendorf_12_Stolperstein_Messinggrau%2C_Manfred.jpg'}}, {'name': 'Adele Regensburger', 'lived': '1874–1942', 'date': '4.\xa0Sep. 2017', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Aschersleben_J%C3%BCdendorf_12_Stolperstein_Regensburger%2C_Adele.jpg/160px-Aschersleben_J%C3%BCdendorf_12_Stolperstein_Regensburger%2C_Adele.jpg'}}, {'name': 'David Regensburger', 'lived': '1866–1935', 'date': '4.\xa0Sep. 2017', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Aschersleben_J%C3%BCdendorf_12_Stolperstein_Regensburger%2C_David.jpg/160px-Aschersleben_J%C3%BCdendorf_12_Stolperstein_Regensburger%2C_David.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-hvPcCdmemLtuPtCwkvhI', 'altitude': 113.2, 'latitude': 51.7527214, 'longitude': 11.4654043, 'data': {'address': 'Taubenstraße 4', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Aschersleben_Taubenstra%C3%9Fe_4_Chocolata.jpg/150px-Aschersleben_Taubenstra%C3%9Fe_4_Chocolata.jpg'}, 'extra': [{'name': 'Erich Hirschfeld', 'lived': '1890–?', 'date': '27.\xa0Sep. 2018', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Aschersleben_Leopoldstra%C3%9Fe_1_Stolperstein_Hirschfeld%2C_Dr._Erich.jpg/160px-Aschersleben_Leopoldstra%C3%9Fe_1_Stolperstein_Hirschfeld%2C_Dr._Erich.jpg'}}, {'name': 'Else Hirschfeld geb. Neumann', 'lived': '1899–?', 'date': '27.\xa0Sep. 2018', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Aschersleben_Leopoldstra%C3%9Fe_1_Stolperstein_Hirschfeld%2C_Else.jpg/160px-Aschersleben_Leopoldstra%C3%9Fe_1_Stolperstein_Hirschfeld%2C_Else.jpg'}}, {'name': 'Judith Hirschfeld', 'lived': '1925–2013', 'date': '27.\xa0Sep. 2018', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Aschersleben_Leopoldstra%C3%9Fe_1_Stolperstein_Hirschfeld%2C_Judith.jpg/160px-Aschersleben_Leopoldstra%C3%9Fe_1_Stolperstein_Hirschfeld%2C_Judith.jpg'}}, {'name': 'Hans-Gideon Hirschfeld', 'lived': '1921–?', 'date': '27.\xa0Sep. 2018', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Aschersleben_Leopoldstra%C3%9Fe_1_Stolperstein_Hirschfeld%2C_Hans-Gideon.jpg/160px-Aschersleben_Leopoldstra%C3%9Fe_1_Stolperstein_Hirschfeld%2C_Hans-Gideon.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-RQFghCXxygFLAKujJbWG', 'altitude': 118.1, 'latitude': 51.75505949999999, 'longitude': 11.4564453, 'data': {'address': 'Über den Steinen 33', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Aschersleben_%C3%9Cber_den_Steinen_33.jpg/150px-Aschersleben_%C3%9Cber_den_Steinen_33.jpg'}, 'extra': [{'name': 'Else Bendix', 'lived': '1882–?', 'date': '4.\xa0Sep. 2017', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Aschersleben_Taubenstra%C3%9Fe_4_Stolperstein_Bendix%2C_Else.jpg/160px-Aschersleben_Taubenstra%C3%9Fe_4_Stolperstein_Bendix%2C_Else.jpg'}}, {'name': 'Hedwig Bendix', 'lived': '1885–?', 'date': '4.\xa0Sep. 2017', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Aschersleben_Taubenstra%C3%9Fe_4_Stolperstein_Bendix%2C_Hedwig.jpg/160px-Aschersleben_Taubenstra%C3%9Fe_4_Stolperstein_Bendix%2C_Hedwig.jpg'}}]}}, {'origin': 'server', 'icon': 'img/stolperstein.png', 'id': 's-bYofVUZTnXhfPqASRiDd', 'altitude': 116.6, 'latitude': 51.7552975, 'longitude': 11.4544203, 'data': {'address': 'Wilhelmstraße 21–23', 'link': {'house': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Aschersleben%2C_Bildungszentrum_Bestehornpark%2C_Bildungscampus.jpg/150px-Aschersleben%2C_Bildungszentrum_Bestehornpark%2C_Bildungscampus.jpg'}, 'extra': [{'name': 'Hedwig Helft', 'lived': '1882–?', 'biography': 'Hedwig Helft wurde in Heiligenstadt geboren. Sie wurde am 14. April 1942 von Magdeburg aus ins Ghetto Warschau deportiert und dort vermutlich ermordet.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Helft%2C_Hedwig.jpg/160px-Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Helft%2C_Hedwig.jpg'}}, {'name': 'Else Lekisch', 'lived': '1888–1960', 'biography': 'Else Schwabe heiratete 1910 Dr. Hugo Lekisch und zog mit ihm nach Essen. 1937 gelang ihnen die Emigration in die Vereinigten Staaten.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Lekisch%2C_Else.jpg/160px-Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Lekisch%2C_Else.jpg'}}, {'name': 'Albert Schwabe', 'lived': '1880–1942', 'biography': 'Albert Schwabe wurde in Heiligenstadt geboren. Am 12. April 1942 entzog er sich der bevorstehenden Deportation durch Suizid.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Schwabe%2C_Albert.jpg/160px-Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Schwabe%2C_Albert.jpg'}}, {'name': 'Otto Schwabe', 'lived': '1886–?', 'biography': 'Otto Schwabe konnte nach Palästina emigrieren.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Schwabe%2C_Otto.jpg/160px-Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Schwabe%2C_Otto.jpg'}}, {'name': 'Berta Weinberg', 'lived': '1881–1942', 'biography': 'Berta Weinberg wurde in Heiligenstadt geboren. Am 11. Juni 1942 wurde sie von Frankfurt am Main aus ins Vernichtungslager Sobibor deportiert und dort ermordet.', 'date': '9.\xa0Aug. 2014', 'link': {'stone': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Weinberg%2C_Berta.jpg/160px-Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Weinberg%2C_Berta.jpg'}}, {'name': 'Thekla Meininger', 'lived': '1890–?', 'date': '9.\xa0Aug. 2014', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Meininger%2C_Thekla.jpg/160px-Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Meininger%2C_Thekla.jpg'}}, {'name': 'Paula Schwabe', 'lived': '1895–?', 'date': '9.\xa0Aug. 2014', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Schwabe%2C_Paula.jpg/160px-Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Schwabe%2C_Paula.jpg'}}, {'name': 'Ilse de Stern', 'lived': '1914–?', 'date': '9.\xa0Aug. 2014', 'link': {'picture': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Stern%2C_Ilse_de.jpg/160px-Aschersleben_%C3%9Cber_den_Steinen_33_Stolperstein_Stern%2C_Ilse_de.jpg'}}]}}]


    for (var e = 0; e < objectData.length; e++) {
      if (displayed) {
        objectData[e]["circle"] = new google["maps"]["Circle"]({
          "strokeColor": '#FF0000',
          "strokeOpacity": 0.8,
          "strokeWeight": 2,
          "fillColor": '#FF0000',
          "fillOpacity": 0.35,
          "map": map,
          "center": {"lat": objectData[e]["latitude"], "lng": objectData[e]["longitude"]},
          "radius": 20
        });
        objects.push(objectData[e])
      } else {
        for (var i = 0; i < objects.length; i++) {
          if (objects[i]["id"] === objectData[e]["id"]) {
            objects[i]["circle"]["setMap"](null);
            try {
              objects.splice(i, 1);
            } catch (e) {
              console.log(e);
            }
          }
        }
        try {
          document.getElementById(objectData[e]["id"]).remove();
        } catch (err) {
          console.log("not displayed");
        }
      }
    }

  } else if (type.split("-")[0] === "projekt") {
    getURL("https://ar.stephaneum.de/api/locations/" + type.split("-")[1], function(response) {
      objectData = JSON.parse(response);
      console.log(objectData);

      for (var e = 0; e < objectData.length; e++) {
        objectData[e]['info'] = JSON.parse(objectData[e]['info']);
        objectData[e]['origin'] = "stephaneum";
        if (displayed) {
          if (objectData[e]["id"].split("-")[1] != "lokal") {
            objectData[e]["circle"] = new google["maps"]["Circle"]({
              "strokeColor": '#FF0000',
              "strokeOpacity": 0.8,
              "strokeWeight": 2,
              "fillColor": '#FF0000',
              "fillOpacity": 0.35,
              "map": map,
              "center": {"lat": objectData[e]["latitude"], "lng": objectData[e]["longitude"]},
              "radius": 20
            });
          }
          objects.push(objectData[e])
        } else {
          for (var i = 0; i < objects.length; i++) {
            if (objects[i]["id"] === objectData[e]["id"]) {
              if (objectData[e]["id"].split("-")[1] != "lokal") {
                objects[i]["circle"]["setMap"](null);
              }
              try {
                objects.splice(i, 1);
              } catch (e) {
                console.log(e);
              }
            }
          }
          try {
            document.getElementById(objectData[e]["id"]).remove();
          } catch (err) {
            console.log("not displayed");
          }
        }
      }
    });

  } else if (type !== "stolpersteine") {
    getURL(apiUrl + "coords?point=" + device_latitude + ',' + device_longitude + "&radius=" + radius + "&type=" + type, function(response) {
      objectData = JSON.parse(response)["results"];
      var fObjects = [];
      for (var i = 0; i <objectData.length; i++) {
        getElevation(objectData[i], function(data){
          fObjects.push(data);
          if (fObjects.length === objectData.length) {
            // Objects DB
            connectToDB('objects', 1, function(db) {
              if (!db.objectStoreNames.contains("maps")) {
                var storeOS = db.createObjectStore("maps", {
                  "keyPath": 'id'
                });
              }
            }, function(db) {
              for (var i = 0; i < fObjects.length; i++) {
                addItem(db, "maps", fObjects[i]);
              }
              // type_links DB
              if (localStorage.type_links_version) {
                localStorage.type_links_version = Number(localStorage.type_links_version);
              } else {
                localStorage.type_links_version = 1;
              }
              reload(type, displayed, [])
            });
          }
        });
      }

      if (JSON.parse(response)["status"] !== "INVALID_REQUEST") {
        //GPS DB
        connectToDB('location', 1, function(db) {
          if (!db.objectStoreNames.contains("gps")) {
            var storeOS = db.createObjectStore("gps", {
              "autoIncrement": true
            });
          }
        }, function(db) {
          addItem(db, "gps", {
            "time": new Date(),
            "type": type,
            "lat": device_latitude,
            "lng": device_longitude,
            "radius": radius
          })
        })

      } else {
        console.log("wrong web request");
      }
    });
  } else {
    console.error("Unbekannter Typ!");
  }
}

var radius = 10000; // Not implemented

function getTypes(o_type, displayed, device_lat, device_lng) {
  connectToDB('location', 1, function(db) {
    if (!db.objectStoreNames.contains("gps")) {
      console.log("created gps store");
      var storeOS = db.createObjectStore("gps", {
        "autoIncrement": true
      });
    }
  }, function(db) {
    getAll(db, "gps", function(data) {
      var newData = true;
      for (var i = 0; i < data.length; i++) {
        if (data[i]["type"] === o_type) {
          if (data[i]["radius"] - distance(device_lat, data[i]["lat"], device_lng, data[i]["lng"]) > radius / 2) {
            newData = false;
            break;
          }
        }
      }
      if (newData) {
        getNewData(o_type, displayed)
      } else {
        intoObjArr(o_type, displayed) // IDEA: Check that only objects in radius get loaded
      }
    })
  });
}

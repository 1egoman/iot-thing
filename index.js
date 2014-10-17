var request = require("request");
var fs = require("fs");

// the thing
var thingFunction = function(host, port, data, structure, callback) {

  var root = this;
  this.configFile = "iot-thing-config.json";
  root.type = "things";
  root.key = data.key;


  // does the specific id specified exist on the server backend?
  this.doesIdExist = function(id, cback) {
    request.get({
      url: "http://" + host + ":" + port + "/" + root.type + "/" + id + "/data",
      headers: {
        "Content-Type": "application/json"
      }
    }, function(error, response, body) {
      if (body == undefined) {
        // server cannot be contacted
        callback(null, {error: "Cannot reach backend server"});
      } else {
        body = JSON.parse(body);
        cback( body.status != "NOHIT" );
      }
    });
  }


  this.data = {

    push: function(property, val, done) {
      var d = {}
      d[property] = {
        value: val
      };

      this.cache = {};

      request.put(
        {
          url: "http://" + host + ":" + port + "/" + root.type + "/" + root.id + "/data",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(d)
        }, function(error, response, body) {
          done && done(body);
        }
      );
    },


    pull: function(property, done) {
      request.get(
        {
          url: "http://" + host + ":" + port + "/" + root.type + "/" + root.id + "/data",
          headers: {
            "Content-Type": "application/json"
          }
        }, function(error, response, body) {
          if (body == undefined) {
            // server cannot be contacted
            callback(null, {error: "Thing no longer exists on backend server"});
          } else {
            body = body && JSON.parse(body);
            root.cache = body;
            done && done(body && body[property] || {value: undefined})
          }
        }
      );
    }

  }

  // ran after the id is discovered
  this.idExists = function(callback) {
    data && data.debug && console.log(root.id)
    loop = function() {
      if (callback(root) == false) {
        clearInterval(loop);
      }
    }
    setInterval(loop, 1000);
  }

  // add new thing
  this.addNewThing = function() {
    request.post(
      {
        url: "http://" + host + ":" + port + "/" + root.type + "/add/" + root.key,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(structure)
      }, function(error, response, body) {
        console.log(body)
        body = JSON.parse(body);
        root.id = body.id;
        root.id && fs.writeFile(root.configFile, "{\"id\": "+root.id+"}");
        root.idExists(callback);
      }
    );
  }

  // try and read config
  this.go = function() {
    fs.readFile(this.configFile, function(err, data) {
      if (data) data = JSON.parse(data.toString());
      testId = data && data.id;
      data && data.debug && console.log("ti", testId)



      root.doesIdExist(testId, function(doesIt) {
        // console.log("doesid", doesIt, testId)
        if (doesIt == false) {
          root.addNewThing();
        } else {
          root.id = testId;
          root.idExists(callback);
        }
      });



    });
  };

}

// service: inherits mostly from a thing with a few subtile differences
var serviceFunction = function(host, port, data, structure, callback) {
  service = new thingFunction(host, port, data, structure, callback);
  service.configFile = "iot-service-config.json";
  service.type = "services";

  this.go = function() {
    service.go();
  }
};

module.exports = {
  thing: thingFunction,
  service: serviceFunction
}

//
// id = 6
// new module.exports("127.0.0.1", 8000, id, {
//   name: "Example Thing",
//   desc: "Prooves that stuff works",
//   data: {
//     message: {
//       value: "Hello World"
//     },
//     showMessage: {
//       value: false,
//       label: "Show message in terminal"
//     }
//   }
// }, function(thing) {
//   // get the thing id, and print it out
//   // console.log("Thing ID is", thing.id);
//
//   // did the user set showMessage to true?
//   thing.data.pull("showMessage", function(val) {
//     if (val.value == true) {
//       // set it to false
//       thing.data.push("showMessage", false);
//
//       // show the message in the console
//       thing.data.pull("message", function(val) {
//         console.log("Output:", val.value);
//       });
//     }
//   });
//
//
// });

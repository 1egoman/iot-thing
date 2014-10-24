var request = require("request");
var fs = require("fs");

// the thing
var thingFunction = function(host, port, data, structure, callback) {

  var root = this;
  this.configFile = "iot-thing-config.json";
  root.type = "things";
  root.key = data.key;
  root.serverAccessible = false;


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
        console.log("-> server is offline (waiting for a connection)");
        root.loop();
      } else {
        body = JSON.parse(body);
        cback( body.status != "NOHIT" );
      }
    });
  }

  // data manipulation functions
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
            console.log("-> server has gone offline");
            root.serverAccessible = false;
            done(root.cache[property]);
          } else {
            body = body && JSON.parse(body);
            root.cache = body;
            root.serverAccessible = true;
            done && done(body && body[property] || {value: undefined})
          }
        }
      );
    }

  }

  // ran after the id is discovered, as a bridge to the main loop
  this.idExists = function(callback) {
    console.log("-> connected to backend with id of %d", root.id);
    root.serverAccessible = true;
    this.loop();
  }

  // main loop of the app
  this.loop = function() {
    loop = function() {
      if (root.serverAccessible) {
        // yea, the server's still out there somewhere
        if (callback(root) == false) {
          clearInterval(loop);
        }
      } else {
        // otherwise, try and contact server
        root.pingServer(function(error) {
          if (error == null) {
            // connection has been reopened
            console.log("-> Server is back online!");
            root.serverAccessible = true;
          }
        });
      }
    }
    setInterval(loop, 1000);
  }

  // ping the server
  // a simple test to see if the server is up, currently
  this.pingServer = function(callback) {
    request.get({
      url: "http://" + host + ":" + port + "/" + root.type + "/all",
      headers: {
        "Content-Type": "application/json"
      }
    }, function(error, response, body) {
      callback(error);
    });
  }

  // add new thing
  this.addNewThing = function() {
    console.log("-> Adding new thing...");
    request.post(
      {
        url: "http://" + host + ":" + port + "/" + root.type + "/add/" + root.key,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(structure)
      }, function(error, response, body) {
        body = JSON.parse(body);
        root.id = body.id;

        // write the id to the config
        if (error == null && body.status == "OK") {
          root.id && fs.writeFile(root.configFile, "{\"id\": "+root.id+"}");
          root.idExists(callback);
        } else {
          console.log("-> add thing error:", body)
        }
      }
    );
  }

  // try and read config
  this.go = function() {
    fs.readFile(this.configFile, function(err, data) {
      if (data) data = JSON.parse(data.toString());
      testId = data && data.id;

      // do we need to add a new thing, or reopen a pervious connection?
      root.doesIdExist(testId, function(doesIt) {
        if (doesIt == false) {
          root.addNewThing(); // new
        } else {
          root.id = testId;
          root.idExists(callback); // continue
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

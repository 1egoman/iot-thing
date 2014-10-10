var request = require("request");
var fs = require("fs");

// the thing
module.exports = function(host, port, data, structure, callback) {

  var root = this;
  this.configFile = "iot-thing-config.json";


  // does the specific id specified exist on the server backend?
  this.doesIdExist = function(id, cback) {
    request.get({
      url: "http://" + host + ":" + port + "/things/" + id + "/data",
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
          url: "http://" + host + ":" + port + "/things/" + root.id + "/data",
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
          url: "http://" + host + ":" + port + "/things/" + root.id + "/data",
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
    setInterval(function() {
      callback(root);
    }, 1000);
  }

  // add new thing
  this.addNewThing = function() {
    request.post(
      {
        url: "http://" + host + ":" + port + "/things/add",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(structure)
      }, function(error, response, body) {
        body = JSON.parse(body);
        root.id = body.id;
        fs.writeFile(root.configFile, "{\"id\": "+root.id+"}");
        root.idExists(callback);
      }
    );
  }

  // try and read config
  // this.refreshIdAllocation = function() {
    fs.readFile(this.configFile, function(err, data) {
      if (data) data = JSON.parse(data.toString());
      testId = data && data.id;
      data && data.debug && console.log("ti", testId)



      root.doesIdExist(testId, function(doesIt) {
        data && data.debug && console.log("doesid", doesIt)
        if (doesIt == false) {
          root.addNewThing();
        } else {
          root.id = testId;
          root.idExists(callback);
        }
      });



    });
  // };
  // this.refreshIdAllocation();

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

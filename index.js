const htmlToJson = require("html-to-json"),
  fs = require("fs"),
  url = require("url"),
  events = require("events");

var maxProject = 1750;

function getCurrentDate() {
  var date = new Date();
  var year = date.getFullYear();
  var month = date.getMonth() + 1; // "+ 1" becouse the 1st month is 0
  var day = date.getDate();
  var hour = date.getHours();
  var minutes = date.getMinutes();
  var secconds = date.getSeconds();

  return (
    year + "" + month + "" + day + "-" + hour + "" + minutes + "" + secconds
  );
}

function sortByKey(array, key) {
  return array.sort(function(a, b) {
    var x = a[key];
    var y = b[key];
    return y - x;
  });
}

class Scrap {
  constructor() {
    this.min = 1;
    this.max = maxProject;
    this.projects = [];
  }

  parseResults(fileName) {
    var obj = JSON.parse(fs.readFileSync(fileName, "utf8"));
    return sortByKey(obj, "votesCount");
  }

  async scrapProjects() {
    var i = this.min;
    var that = this;
    for (var i = that.min; i <= that.max; i++) {
      let result = await this.getProject(i);
      if (result.project != "") {
        that.projects.push(result);
      }
    }
    return that.projects;
  }

  getProject(id, callback) {
    return htmlToJson.request(
      {
        uri: "https://lafabrique-france.aviva.com/voting/projet/vue/30-" + id
      },
      {
        project: function($project) {
          return $project
            .find(".project-details h1")
            .text()
            .replace("\\n", "")
            .trim();
        },
        organisation: function($project) {
          return $project
            .find(".project-top-container h2")
            .text()
            .replace("\\n", "")
            .trim();
        },
        category: function($project) {
          return $project
            .find(".project-category h4")
            .text()
            .replace("\\n", "")
            .trim();
        },
        votesCount: function($doc) {
          var val = $doc.find(".votes-count").html();
          return val && val != undefined && val != ""
            ? Number(val.replace(/&#xA0;/g, ""))
            : null;
        },
        url: function() {
          return (
            "https://lafabrique-france.aviva.com/voting/projet/vue/30-" + id
          );
        }
      },
      callback
    );
  }
}

var http = require("http");

var server = http.createServer(function(request, response) {
  var path = url.parse(request.url).pathname;
  if (path == "/stats") {
    request.setTimeout(maxProject * 300);
    response.writeHead(200, { "Content-Type": "text/html" });
    var scrap = new Scrap();
    var that = this;
    scrap.scrapProjects().then(res => {
      var results = sortByKey(res, "votesCount");
      var htmlResult =
        "<table class='table'><thead class='thead-dark'><tr><th scope='col'>#</th><th scope='col'>Vote</th><th scope='col'>Project</th><th scope='col'>Company</th><th scope='col'>Category</th><th scope='col'><small>Date: " +
        getCurrentDate() +
        "</small></th></tr></thead>";
      for (var i = 0; i < results.length; i++) {
        var orga = results[i].organisation.toLowerCase();
        htmlResult +=
          "<tr class='" +
          (orga == "courseur" || orga == "jeanne rives"
            ? "table-danger"
            : i < 140 ? "table-success" : "") +
          "'><th scope='row'>" +
          (i + 1) +
          "</th><td>" +
          results[i].votesCount +
          "</td><td>" +
          results[i].project +
          "</td><td>" +
          results[i].organisation +
          "</td><td>" +
          results[i].category +
          "</td><td><a href='" +
          results[i].url +
          "' target='_blank' class='btn btn-light'>Open</a></td></tr>";
      }

      response.end(htmlResult, "utf-8");
    });
  } else {
    fs.readFile("./index.html", function(err, file) {
      if (err) {
        console.log(err);
        return;
      }
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(file, "utf-8");
    });
  }
});

var port = process.env.PORT || 1337;
server.listen(port);

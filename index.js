const htmlToJson = require("html-to-json"),
  fs = require("fs"),
  url = require("url"),
  events = require("events");

var maxProject = 50;

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
  return array.sort(function (a, b) {
    var x = a[key];
    var y = b[key];
    return y - x;
  });
}

class Scrap {
  constructor() {
    //this.activeProjects = Object.values(JSON.parse(fs.readFileSync("projects.json", "utf-8")));
    this.min = 1;//this.activeProjects != null && this.activeProjects.length > 0 ? 0 : 1;
    this.max = maxProject//this.activeProjects.length;//this.activeProjects != null && this.activeProjects.length > 0 ? this.activeProjects.length - 1 : maxProject;
    this.projects = [];
  }

  parseResults(fileName) {
    var obj = JSON.parse(fs.readFileSync(fileName, "utf8"));
    return sortByKey(obj, "votesCount");
  }

  async scrapProjects() {
    var that = this;
    // fs.writeFile("./projects.json", "[");
    for (var i = that.min; i <= that.max; i++) {
      let result = await this.getProject(i/*that.activeProjects[i]*/);
      if (result.project != "") {
        that.projects.push(result);
        // fs.appendFile("./projects.json", "," + i);
      }
    }
    // fs.appendFile("./projects.json", "]");
    return that.projects;
  }

  getProject(id, callback) {
    return htmlToJson.request(
      {
        uri: "https://lafabrique-france.aviva.com/voting/projet/vue/30-" + id
      },
      {
        project: function ($project) {
          return $project
            .find(".project-details h1")
            .text()
            .replace("\\n", "")
            .trim();
        },
        organisation: function ($project) {
          return $project
            .find(".project-top-container h2")
            .text()
            .replace("\\n", "")
            .trim();
        },
        category: function ($project) {
          return $project
            .find(".project-category h4")
            .text()
            .replace("\\n", "")
            .trim();
        },
        votesCount: function ($doc) {
          var val = $doc.find(".votes-count").html();
          return val && val != undefined && val != ""
            ? Number(val.replace(/&#xA0;/g, ""))
            : null;
        },
        url: function () {
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

var server = http.createServer(function (request, response) {
  var path = url.parse(request.url).pathname;
  if (path == "/stats") {
    request.setTimeout(maxProject * 300);
    response.writeHead(200, { "Content-Type": "text/html" });

    var scrap = new Scrap();
    var that = this;
    scrap.scrapProjects().then(res => {
      var groupRes = sortByKey(res, "category");
      var grouped = groupRes.reduce(function (result, current) {
        result[current.category] = result[current.category] || [];
        result[current.category].push(current);
        return result;
      }, {});
      var currentDate = getCurrentDate();
      var results = sortByKey(res, "votesCount");

      var htmlGroupResult = "<div id='accordion-category'>";
      Object.keys(grouped).forEach((element, index) => {
        var ordered = sortByKey(grouped[element], "votesCount");
        htmlGroupResult += `<div class='card'>
        <div class='card-header' id='headingGroupCat-${index}' style='padding: 0.5rem;'>
        <h5 class='mb-0'>
        <button class='btn btn-link' style='font-size: 0.9rem;' data-toggle='collapse' data-target='#cat-${index}' aria-expanded='true' aria-controls='cat-${index}'>${element} (${(ordered.length + " projects ~" + (Math.round(ordered.length * 100 / results.length)))}%)</button></h5>
        </div>
        <div id="cat-${index}" class="collapse" aria-labelledby="headingGroupCat">
          <div class="card-body">`;
        htmlGroupResult += "<table class='table table-striped resultsByCategory'><thead class='thead-dark'><tr><th scope='col'>#</th><th scope='col'>Vote</th><th scope='col'>Project</th><th scope='col'>Company</th><th scope='col'><small>Date: " +
          currentDate +
          "</small></th></tr></thead>";
        for (var i = 0; i < ordered.length; i++) {
          var orga = ordered[i].organisation.toLowerCase();
          htmlGroupResult += "<tr class='" +
            (orga == "courseur" || orga == "jeanne rives"
              ? "table-danger" : "") + "'><th scope='row'>" + (i + 1) + "</th><td>" +
            ordered[i].votesCount +
            "</td><td>" +
            ordered[i].project +
            "</td><td>" +
            ordered[i].organisation +
            "</td><td><a href='" +
            ordered[i].url +
            "' target='_blank' class='btn btn-light'>Open</a></td></tr>";
        }
        htmlGroupResult += "</table></div></div></div><hr/>";
      });
      htmlGroupResult += "</div>";

      var htmlResult =
        "<table id='resultsAll' class='table table-striped'><thead class='thead-dark'><tr><th scope='col'>#</th><th scope='col'>Vote</th><th scope='col'>Project</th><th scope='col'>Company</th><th scope='col'>Category</th><th scope='col'><small>Date: " +
        currentDate +
        "</small></th></tr></thead>";
      for (var i = 0; i < results.length; i++) {
        var orga = results[i].organisation.toLowerCase();
        htmlResult +=
          "<tr class='" +
          (orga == "courseur" || orga == "jeanne rives"
            ? "table-danger"
            : "") +
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
      htmlResult += "</table>";

      var finalResult = `
      <div id="accordion">
        <div class="card">
          <div class="card-header" id="headingGroup" style="background-color: rgba(0,0,0,.07);">
            <h5 class="mb-0">
              <button class="btn btn-link" data-toggle="collapse" data-target="#groups" aria-expanded="true" aria-controls="groups">
                Group by Category
              </button>
            </h5>
          </div>
          <div id="groups" class="collapse" aria-labelledby="headingGroup">
            <div class="card-body">
              ${htmlGroupResult}
            </div>
          </div>
        </div>
        <hr/>
        <div class="card">
          <div class="card-header" id="headingList" style="background-color: rgba(0,0,0,.07);">
            <h5 class="mb-0">
              <button class="btn btn-link" data-toggle="collapse" data-target="#lists" aria-expanded="true" aria-controls="lists">
                All projects (${results.length} projects)
              </button>
            </h5>
          </div>
          <div id="lists" class="collapse" aria-labelledby="headingList">
            <div class="card-body">
              ${htmlResult}
            </div>
          </div>
        </div>
      </div>`
      response.end(finalResult, "utf-8");
    });
  } else {
    fs.readFile("./index.html", function (err, file) {
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
server.timeout = maxProject * 300;

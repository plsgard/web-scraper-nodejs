const htmlToJson = require("html-to-json"),
  fs = require("fs"),
  url = require("url"),
  events = require("events");

var maxProject = 20;

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

var colors = [
  "rgb(54, 162, 235)",
  "rgb(75, 192, 192)",
  "rgb(201, 203, 207)",
  "rgb(255, 159, 64)",
  "rgb(153, 102, 255)",
  "rgb(255, 99, 132)",
  "rgb(255, 205, 86)"
];

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

function jsonToHtml(res) {
  var groupRes = sortByKey(res, "category");
  var grouped = groupRes.reduce(function (result, current) {
    result[current.category] = result[current.category] || [];
    result[current.category].push(current);
    return result;
  }, {});
  var currentDate = getCurrentDate();
  var currentCorrectDate = new Date(Date.now()).toLocaleString('fr-FR');
  var results = sortByKey(res, "votesCount");

  var htmlGroupResult = "<div id='accordion-category'>";
  Object.keys(grouped).forEach((element, index) => {
    var ordered = sortByKey(grouped[element], "votesCount");
    var percent = (Math.round(ordered.length * 100 / results.length));
    if (index > 0)
      htmlGroupResult += "<hr/>";
    htmlGroupResult += `<div class='card'>
    <div class='card-header category' id='headingGroupCat-${index}' style='padding: 0.5rem;' data-name="${element}" data-percent="${ordered.length}" data-color="${colors[index]}">
    <h5 class='mb-0'>
    <span class="dot" style="background-color: ${colors[index]}"></span><button class='btn btn-link' style='font-size: 0.9rem;' data-toggle='collapse' data-target='#cat-${index}' aria-expanded='true' aria-controls='cat-${index}'>${element} <small>(<strong>${(ordered.length + "</strong> projects <strong>~" + percent)}%</strong>)</small></button></h5>
    </div>
    <div id="cat-${index}" class="collapse" aria-labelledby="headingGroupCat">
      <div class="card-body">`;
    htmlGroupResult += "<table class='table table-striped table-fixed resultsByCategory'><thead class='thead-dark'><tr><th scope='col'>#</th><th scope='col'>Vote</th><th scope='col'>Project</th><th scope='col'>Company</th><th scope='col'></th></tr></thead>";
    for (var i = 0; i < ordered.length; i++) {
      var orga = ordered[i].organisation.toLowerCase();
      htmlGroupResult += "<tr><th scope='row'>" + (i + 1) + "</th><td>" +
        ordered[i].votesCount +
        "</td><td>" +
        ordered[i].project +
        "</td><td>" +
        ordered[i].organisation +
        "</td><td><a href='" +
        ordered[i].url +
        "' target='_blank' class='btn btn-light'>Open</a></td></tr>";
    }
    htmlGroupResult += "</table></div></div></div>";
  });
  htmlGroupResult += "</div>";

  var totalVote = 0;
  var htmlResult =
    "<table id='resultsAll' class='table table-striped table-fixed'><thead class='thead-dark'><tr><th scope='col'>#</th><th scope='col'>Vote</th><th scope='col'>Project</th><th scope='col'>Company</th><th scope='col'>Category</th><th scope='col'></th></tr></thead>";
  for (var i = 0; i < results.length; i++) {
    var orga = results[i].organisation.toLowerCase();
    htmlResult +=
      "<tr><th scope='row'>" +
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

    totalVote += results[i].votesCount;
  }
  htmlResult += "</table>";

  var totalProjects = new Number(results.length).toLocaleString('fr-FR');
  var totalVotes = new Number(totalVote).toLocaleString('fr-FR');
  var finalResult = `
  <div class="row">
  <div class="col-5">
  <dl class="row">
  <dt class="col-sm-3">Last update</dt>
  <dd class="col-sm-9">${currentCorrectDate}</dd>
  <dt class="col-sm-3">Projects</dt>
  <dd class="col-sm-9">${totalProjects}</dd>
  <dt class="col-sm-3">Votes</dt>
  <dd class="col-sm-9">${totalVotes}</dd>
  </dl>
  </div>
  </div>
  <div id="accordion">
    <div class="card">
      <div class="card-header" id="headingGroup">
        <h5 class="mb-0">
          <button class="btn btn-link" data-toggle="collapse" data-target="#groups" aria-expanded="true" aria-controls="groups">
            Group by Category
          </button>
          <small class="float-right">Last update: ${currentCorrectDate}</small>
        </h5>
      </div>
      <div id="groups" class="collapse" aria-labelledby="headingGroup">
        <div class="card-body">
        <div class="row">
        <div class="col-7">
          ${htmlGroupResult}
          </div>
          <div class="col-5">
          <canvas id="chart"></canvas>
          </div>
        </div>
        </div>
      </div>
    </div>
    <hr/>
    <div class="card">
      <div class="card-header" id="headingList">
        <h5 class="mb-0">
          <button class="btn btn-link" data-toggle="collapse" data-target="#lists" aria-expanded="true" aria-controls="lists">
            All projects <small>(<strong>${totalProjects}</strong> projects - <strong>${totalVotes}</strong> votes)</small>
          </button>
          <small class="float-right">Last update: ${currentCorrectDate}</small>
        </h5>
      </div>
      <div id="lists" class="collapse" aria-labelledby="headingList">
        <div class="card-body">
          ${htmlResult}
        </div>
      </div>
    </div>
  </div>`;

  return finalResult;
}

function injectResults(html, response) {
  fs.readFile("./index.html", 'utf-8', function (err, file) {
    if (err) {
      console.log(err);
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html" });

    if (html != null) {
      file.replace("<!-- DATA -->", html);
      response.end(file, "utf-8");
    }
    else if (fs.existsSync("./datas/data.json")) {
      fs.readFile("./datas/data.json", 'utf-8', function (err, jsonFile) {
        if (err) {
          console.log(err);
          return;
        }
        var finalResult = jsonToHtml(JSON.parse(jsonFile));
        finalResult = file.replace("<!-- DATA -->", finalResult);
        response.end(finalResult, "utf-8");
      });
    } else {
      response.end(file, "utf-8");
    }
  });
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
      var finalResult = jsonToHtml(res);
      fs.writeFile("./datas/data.json", JSON.stringify(res));
    });
    response.end(maxProject.toString(), "utf-8");
  } else {
    injectResults(null, response);
  }
});

var port = process.env.PORT || 1337;
server.listen(port);
server.timeout = maxProject * 300;

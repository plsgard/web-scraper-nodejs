const Data = require('./services/data'), url = require("url"), fs = require("fs"), http = require("http");

var maxProject = 1800;
var dataFilePath = './datas/data.json';
var prevDataFilePath = './datas/data_prev.json';
var basePageUrl = 'https://lafabrique-france.aviva.com/voting/projet/vue/30-';

var server = http.createServer(function (request, response) {
  var path = url.parse(request.url).pathname;
  var data = new Data(basePageUrl, maxProject, "./index.html", dataFilePath, prevDataFilePath);
  if (path == "/stats") {
    request.setTimeout(maxProject * 300);
    response.writeHead(200, { "Content-Type": "text/html" });

    var that = this;
    fs.copyFileSync(dataFilePath, prevDataFilePath);
    data.scrapProjects().then(res => {
      fs.writeFile(dataFilePath, JSON.stringify(res));
    });
    response.end(maxProject.toString(), "utf-8");
  } else {
    data.injectResults(response);
  }
});

var port = process.env.PORT || 1337;
server.listen(port);
server.timeout = maxProject * 300;

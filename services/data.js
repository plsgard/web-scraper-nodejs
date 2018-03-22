const fs = require("fs"), Scrap = require('./scrap');

module.exports = class Data extends Scrap {
    constructor(basePageUrl, maxProject, baseFilePath, dataFilePath, prevDataFilePath) {
        super(basePageUrl, maxProject);
        this.baseFilePath = baseFilePath;
        this.dataFilePath = dataFilePath;
        this.prevDataFilePath = prevDataFilePath;
    }

    injectResults(response) {
        var that = this;
        fs.readFile(this.baseFilePath/*"./index.html"*/, 'utf-8', function (err, file) {
            if (err) {
                console.log(err);
                return;
            }
            response.writeHead(200, { "Content-Type": "text/html" });

            if (fs.existsSync(that.dataFilePath /*"./datas/data.json"*/)) {
                fs.readFile(that.dataFilePath /*"./datas/data.json"*/, 'utf-8', function (err, jsonFile) {
                    if (err) {
                        console.log(err);
                        return;
                    }

                    var stats = fs.statSync(that.dataFilePath /*"./datas/data.json"*/);
                    var date = stats.mtime != null ? stats.mtime : stats.birthtime;
                    if (fs.existsSync(that.prevDataFilePath /*"./datas/data_prev.json"*/)) {
                        fs.readFile(that.prevDataFilePath /*"./datas/data_prev.json"*/, 'utf-8', function (err, prevFile) {
                            if (err) {
                                console.log(err);
                                return;
                            }
                            var prevStats = fs.statSync(that.prevDataFilePath /*"./datas/data_prev.json"*/);
                            var prevDate = prevStats.mtime != null ? prevStats.mtime : prevStats.birthtime;
                            var finalResult = that.jsonToHtml(JSON.parse(jsonFile), date, JSON.parse(prevFile), prevDate);
                            finalResult = file.replace("<!-- DATA -->", finalResult);
                            response.end(finalResult, "utf-8");
                        });
                    } else {
                        var finalResult = that.jsonToHtml(JSON.parse(jsonFile), date);
                        finalResult = file.replace("<!-- DATA -->", finalResult);
                        response.end(finalResult, "utf-8");
                    }
                });
            } else {
                response.end(file, "utf-8");
            }
        });
    }
}
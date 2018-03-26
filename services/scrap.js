const htmlToJson = require("html-to-json"),
    Utils = require("../utils/index");

module.exports = class Scrap {
    constructor(basePageUrl, maxProject) {
        this.min = 1;
        this.max = maxProject;
        this.basePageUrl = basePageUrl;
        this.utils = new Utils();
    }

    async scrapProjects() {
        var that = this;
        var projects = [];
        for (var i = that.min; i <= that.max; i++) {
            let result = await this.getProject(i);
            if (result.project != "") {
                projects.push(result);
            }
        }
        return projects;
    }

    getProject(id, callback) {
        var that = this;
        return htmlToJson.request(
            {
                uri: that.basePageUrl + /*"https://lafabrique-france.aviva.com/voting/projet/vue/30-" +*/ id
            },
            {
                id: function () {
                    return id;
                },
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
                        that.basePageUrl + /*"https://lafabrique-france.aviva.com/voting/projet/vue/30-" +*/ id
                    );
                }
            },
            callback
        );
    }

    jsonToHtml(res, date, prev, prevDate) {
        var that = this;
        var groupRes = that.utils.sortByKey(res, "category");
        var grouped = groupRes.reduce(function (result, current) {
            result[current.category] = result[current.category] || [];
            result[current.category].push(current);
            return result;
        }, {});
        var currentCorrectDate = new Date(date).toLocaleString('fr-FR');
        var prevCorrectDate = prevDate != null ? new Date(prevDate).toLocaleString('fr-FR') : null;
        var results = that.utils.sortByKey(res, "votesCount");

        var htmlGroupResult = "<div id='accordion-category'>";
        Object.keys(grouped).forEach((element, index) => {
            var ordered = that.utils.sortByKey(grouped[element], "votesCount");
            var percent = (Math.round(ordered.length * 100 / results.length));
            if (index > 0)
                htmlGroupResult += "<hr/>";
            htmlGroupResult += `<div class='card'>
          <div class='card-header category' id='headingGroupCat-${index}' style='padding: 0.5rem;' data-name="${element}" data-percent="${ordered.length}" data-color="${that.utils.colors[index]}">
          <h5 class='mb-0'>
          <span class="dot" style="background-color: ${that.utils.colors[index]}"></span><button class='btn btn-link' style='font-size: 0.9rem;' data-toggle='collapse' data-target='#cat-${index}' aria-expanded='true' aria-controls='cat-${index}'>${element} <small>(<strong>${(ordered.length + "</strong> projects <strong>~" + percent)}%</strong>)</small></button></h5>
          </div>
          <div id="cat-${index}" class="collapse" aria-labelledby="headingGroupCat">
            <div class="card-body">`;
            htmlGroupResult += "<table class='table table-striped table-fixed resultsByCategory'><thead class='thead-dark'><tr><th scope='col'>#</th><th scope='col' style='min-width:120px;'>Vote</th><th scope='col'>Project</th><th scope='col'>Company</th><th scope='col'></th></tr></thead>";
            for (var i = 0; i < ordered.length; i++) {
                var prevVote = 0;
                if (prev != null) {
                    var p = prev.find(x => x.id == ordered[i].id);
                    if (p != null) {
                        prevVote = p.votesCount;
                    }
                }
                var increase = ordered[i].votesCount - prevVote;
                htmlGroupResult += "<tr><th scope='row'>" + (i + 1) + "</th><td>" +
                    ordered[i].votesCount.toLocaleString('fr-FR') + (prevVote > 0 ? "<br/><small>(+" + increase + " ~" + Number.parseFloat(increase / prevVote * 100).toFixed(2) + "%)</small>" : "") +
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
        var bestProgression = 0;
        var bestProgressionProject = {
            name: '',
            votes: 0,
            progression: 0
        };
        var htmlResult =
            "<table id='resultsAll' class='table table-striped table-fixed'><thead class='thead-dark'><tr><th scope='col'>#</th><th scope='col' style='min-width:120px;'>Vote</th><th scope='col'>Project</th><th scope='col'>Company</th><th scope='col'>Category</th><th scope='col'></th></tr></thead>";
        for (var i = 0; i < results.length; i++) {
            var prevVote = 0;
            if (prev != null) {
                var p = prev.find(x => x.id == results[i].id);
                if (p != null) {
                    prevVote = p.votesCount;
                }
            }
            var increase = results[i].votesCount - prevVote;
            var progression = increase / prevVote * 100;
            if (progression !== Number.POSITIVE_INFINITY && progression > bestProgression) {
                bestProgressionProject.name = results[i].project;
                bestProgressionProject.increase = increase;
                bestProgressionProject.votes = results[i].votesCount;
                bestProgressionProject.progression = Number.parseFloat(progression).toFixed(2);
                bestProgression = progression;
            }
            htmlResult +=
                "<tr><th scope='row'>" +
                (i + 1) +
                "</th><td>" +
                results[i].votesCount.toLocaleString('fr-FR') + (prevVote > 0 ? "<br/><small>(+" + increase + " ~<span class='increase'>" + Number.parseFloat(progression).toFixed(2) + "</span>%)</small>" : "") +
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
        <div class="col-4">
        <dl class="row">
        <dt class="col-sm-4">Last update</dt>
        <dd class="col-sm-8">${currentCorrectDate}</dd>
        <dt class="col-sm-4">Previous update</dt>
        <dd class="col-sm-8">${prevCorrectDate}</dd>
        </dl>
        </div>
        <div class="col-3">
        <dl class="row">
        <dt class="col-sm-3">Projects</dt>
        <dd class="col-sm-9">${totalProjects}</dd>
        <dt class="col-sm-3">Votes</dt>
        <dd class="col-sm-9">${totalVotes}</dd>
        </dl>
        </div>
        <div class="col-5">
        <dl class="row">
        <dt class="col-sm-4">1st</dt>
        <dd class="col-sm-8">${results[0].project} (${results[0].votesCount.toLocaleString('fr-FR')} votes)</dd>
        <dt class="col-sm-4">Best progression</dt>
        <dd class="col-sm-8">${bestProgressionProject.name} (${bestProgressionProject.votes} votes: +${bestProgressionProject.increase} ~${bestProgressionProject.progression}%)</dd>
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
}
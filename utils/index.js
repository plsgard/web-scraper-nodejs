module.exports = class Utils {
    constructor() {
        this.colors = [
            "rgb(54, 162, 235)",
            "rgb(75, 192, 192)",
            "rgb(201, 203, 207)",
            "rgb(255, 159, 64)",
            "rgb(153, 102, 255)",
            "rgb(255, 99, 132)",
            "rgb(255, 205, 86)"
        ];
    }

    sortByKey(array, key) {
        return array.sort(function (a, b) {
            var x = a[key];
            var y = b[key];
            return y - x;
        });
    }
}
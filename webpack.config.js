var path = require("path");
module.exports = {
    entry: {
        viewer : "./js/viewer.js"
    },
    externals: {
        "three" : "THREE",
        "gcodetogeometry" : "gcodetogeometry"
    },
    output: {
        path: path.join(__dirname, "build"),
        // path: __dirname,
        // filename: "MyLibrary.[name].js",
        // library: ["MyLibrary", "[name]"],
        // filename: "[name].js",
        filename: "gcodeviewer.js",
        library: "GCodeViewer",
        libraryTarget: "umd"
    }
};

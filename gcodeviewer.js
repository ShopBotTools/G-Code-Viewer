/*jslint todo: true, browser: true, continue: true */
/*global THREE */

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

var GCodeViewer = {
    renderer : {},
    camera: {},
    scene: {},
    controls: {},
    initialized : false,
    lines: [],  //Represents the paths of the bit
    cncConfiguration: {},
    gcode: [],

    initialize: function(configuration, domElement) {
        var that = GCodeViewer;
        var width = window.innerWidth, height = window.innerHeight;
        if(that.initialized === true) {
            return;
        }

        that.cncConfiguration = configuration;

        if(typeof domElement === "undefined" || domElement === null) {
            that.renderer = new THREE.WebGLRenderer();
            that.renderer.setSize(width, height);
            document.body.appendChild(that.renderer.domElement);
        } else {
            that.renderer = new THREE.WebGLRenderer({canvas: domElement});
            width = parseInt(domElement.width, 10);
            height = parseInt(domElement.height, 10);
        }

        that.scene = new THREE.Scene();
        that.camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
        //TODO: configure OrthographicCamera
        // that.camera = new THREE.OrthographicCamera(width / - 2, width / 2,
        //         height / 2, height / - 2, 1, 1000);
        that.camera.position.x = -1;
        that.camera.position.y = 1;
        that.camera.position.z = -1;
        that.camera.lookAt(new THREE.Vector3(0, 0, 0));

        that.controls = new THREE.OrbitControls(that.camera,
                that.renderer.domElement);
        that.controls.damping = 0.2;
        that.controls.addEventListener('change', that.render);

        that.initialized = true;
    },

    animate: function() {
        window.requestAnimationFrame(GCodeViewer.animate);
        GCodeViewer.controls.update();
    },

    render: function() {
        GCodeViewer.renderer.render(GCodeViewer.scene, GCodeViewer.camera);
    },

    addCurveToLines: function(curve) {
        var that = GCodeViewer;
        var path = new THREE.CurvePath();
        path.add(curve);
        var geometry = path.createPointsGeometry(50);
        var material = new THREE.LineBasicMaterial({ color : 0xffffff });

        // Create the final Object3d to add to the scene
        that.lines.push(new THREE.Line(geometry, material));
    },

    //Careful, we use Z as up, THREE3D use Y as up
    addStraightPath: function(start, end) {
        var curve = new THREE.LineCurve3(
            new THREE.Vector3(start.y, start.z, start.x),
            new THREE.Vector3(end.y, end.z, end.x)
        );
        GCodeViewer.addCurveToLines(curve);
    },

    showLines : function() {
        var that = GCodeViewer;
        var i = 0;
        for(i=0; i < that.lines.length; i++) {
            that.scene.add(that.lines[i]);
        }
    },

    hideLines : function() {
        var that = GCodeViewer;
        var i = 0;
        for(i=0; i < that.lines.length; i++) {
            that.scene.remove(that.lines[i]);
        }
    },

    setGCode: function(string) {
        var that = GCodeViewer;
        that.gcode = string.split('\n');
    },

    createGrid : function() {
        var size = 10;
        var step = 1;

        var gridHelper = new THREE.GridHelper(size, step);
        return gridHelper;
    },

    //Returns a string if no command
    removeComments: function(command) {
        return command.split('(')[0].split(';')[0]; //No need to use regex
    },

    //TODO: do for more than a command by line
    parseGCode: function(command) {
        var obj = { type : "" };
        var that = GCodeViewer;
        var res;
        if(command === "") {
            return obj;
        }
        var com = that.removeComments(command);  //COMmand

        if(com === "") {
            return obj;
        }

        //TODO: do the same for all commands
        if(com.indexOf("G0") !== -1 || com.indexOf("G1") !== -1) {
            if(com.indexOf("G0") !== -1) {
                obj = { type: "G0" };
            } else {
                obj = { type: "G1" };
            }

            res = /X(-?\d+(\.\d*)?)/.exec(com);
            if(res !== null && res.length > 1) {
                obj.x = parseFloat(res[1], 10);
            }
            res = /Y(-?\d+(\.\d*)?)/.exec(com);
            if(res !== null && res.length > 1) {
                obj.y = parseFloat(res[1], 10);
            }
            res = /Z(-?\d+(\.\d*)?)/.exec(com);
            if(res !== null && res.length > 1) {
                obj.z = parseFloat(res[1], 10);
            }
        } else if(com.indexOf("G2") !== -1 || com.indexOf("G3") !== -1) {
            //NOTE: not implemented yet
            if(com.indexOf("G2") !== -1) {
                obj = { type: "G2" };
            } else {
                obj = { type: "G3" };
            }
        } else if(com.indexOf("G4") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G4" };
        } else if(com.indexOf("G20") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G20" };
        } else if(com.indexOf("G21") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G21" };
        } else if(com.indexOf("G90") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G90" };
        } else if(com.indexOf("G91") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G91" };
        } else if(com.indexOf("M4") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "M4" };
        } else if(com.indexOf("M8") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "M8" };
        } else if(com.indexOf("M30") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "M30" };
        }

        return obj;
    },

    viewGCode: function(code) {
        var that = GCodeViewer;
        var i = 0;
        var last = { x:0, y:0, z:0 }, end = { x:0, y:0, z:0 };
        var result = {};
        that.setGCode(code);

        for(i=0; i < that.gcode.length; i++) {
            result = that.parseGCode(that.gcode[i]);
            if(result.type === "G0" || result.type === "G1") {
                end.x = (typeof result.x === "undefined") ? last.x : result.x;
                end.y = (typeof result.y === "undefined") ? last.y : result.y;
                end.z = (typeof result.z === "undefined") ? last.z : result.z;
                that.addStraightPath(last, end);
                last.x = end.x;
                last.y = end.y;
                last.z = end.z;
            } else if(result.type === "G2" || result.type === "G3") {
                //TODO: look the type and do stuff
            } else if(result.type === "G4") {
            } else if(result.type === "G20") {
            } else if(result.type === "G21") {
            } else if(result.type === "G90") {
            } else if(result.type === "G91") {
            } else if(result.type === "M4") {
            } else if(result.type === "M8") {
            } else if(result.type === "M30") {
            }
        }

        that.scene.add(that.createGrid());
        that.showLines();

        that.render();
        that.animate();
    },

    test: function() {
        var that = GCodeViewer;

        that.addStraightPath({x:0,y:0,z:1}, {x:0,y:1,z:1});

        that.addStraightPath({x:0,y:0,z:0}, {x:0,y:0,z:-1});
        that.addStraightPath({x:0,y:0,z:-1}, {x:1,y:1,z:-1});
        that.addStraightPath({x:1,y:1,z:-1}, {x:1,y:1,z:2});
        that.addStraightPath({x:1,y:1,z:2}, {x:0,y:0,z:2});
        that.addStraightPath({x:0,y:0,z:2}, {x:0,y:0,z:0});

        that.scene.add(that.createGrid());
        that.showLines();

        that.render();
        that.animate();
    }
};

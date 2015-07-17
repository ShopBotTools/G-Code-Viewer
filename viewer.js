/*jslint todo: true, browser: true, continue: true, white: true*/
/*global THREE, GParser, GCodeViewer */

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

/**
 * This file contains the class managing the viewer. This the class that the
 * user will instantiate. This is the main class.
 */

GCodeViewer.Viewer = (function() {
    "use strict";
    function Viewer(configuration, domElement, callbackError) {
        var that = this;

        function animate() {
            window.requestAnimationFrame(animate);
            that.controls.update();
        }

        function render() {
            that.renderer.render(that.scene, that.camera);
        }

        that.refreshDisplay = function() {
            render();
            animate();
        };

        function displayError(message) {
            if(that.callbackError !== undefined) {
                that.callbackError(message);
            }
        }

        function setCamera() {
            that.camera.up = new THREE.Vector3(0, 0, 1);
            that.controls = new THREE.OrbitControls(that.camera,
                    that.renderer.domElement);
            if(that.cameraSet === false) {
                that.cameraSet = true;
                that.controls.damping = 0.2;
                that.controls.addEventListener('change', render);
            }
        }

        that.setPerspectiveCamera = function() {
            var width = that.renderer.domElement.width;
            var height = that.renderer.domElement.height;
            that.camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
            setCamera();
        };

        that.setOrthographicCamera = function() {
            var width = that.renderer.domElement.width;
            var height = that.renderer.domElement.height;
            var viewSize = 50;
            var aspectRatio = width / height;
            that.camera = new THREE.OrthographicCamera(
                -aspectRatio * viewSize / 2, aspectRatio * viewSize / 2,
                viewSize / 2, - viewSize / 2, -100, 100
            );
            setCamera();
        };

        //TODO: fit with the board size
        that.showX = function() {
            that.camera.position.x = 5;
            that.camera.position.y = 0;
            that.camera.position.z = 0;
            that.camera.lookAt(that.scene.position);
        };

        that.showY = function() {
            that.camera.position.x = 0;
            that.camera.position.y = 5;
            that.camera.position.z = 0;
            that.camera.lookAt(that.scene.position);
        };

        that.showZ = function() {
            that.camera.position.x = 0;
            that.camera.position.y = 0;
            that.camera.position.z = 5;
            that.camera.lookAt(that.scene.position);
        };

        //Helpers management:
        that.showAxisHelper = function() {
            that.helpers.addAxisHelper();
            that.refreshDisplay();
        };

        that.hideAxisHelper = function() {
            that.helpers.removeAxisHelper();
            that.refreshDisplay();
        };

        that.showArrows = function() {
            that.helper.addArrows();
            that.refreshDisplay();
        };

        that.hideArrows = function() {
            that.helper.removeArrows();
            that.refreshDisplay();
        };

        that.showHelpers = function() {
            that.helper.addHelpers();
            that.refreshDisplay();
        };

        that.hideHelpers = function() {
            that.helper.removeHelpers();
            that.refreshDisplay();
        };

        that.showBoard = function() {
            if(that.cncConfiguration.board === undefined) {
                return;
            }
            var geometry = new THREE.BoxGeometry(
                that.cncConfiguration.board.width,
                that.cncConfiguration.board.length,
                that.cncConfiguration.board.height
            );

            var material = new THREE.MeshBasicMaterial(0xff0000);
            material.transparent = true;
            material.opacity = 0;
            var object = new THREE.Mesh(geometry, material);
            object.position.x = that.cncConfiguration.board.width / 2;
            object.position.y = that.cncConfiguration.board.length / 2;
            object.position.z = that.cncConfiguration.board.height / 2;
            var box = new THREE.BoxHelper(object);
            that.scene.add(object);
            that.scene.add(box);
            that.boardObject = object;
            that.boardHelper = box;
        };

        that.hideBoard = function() {
            that.scene.remove(that.boardObject);
            that.scene.remove(that.boardBox);
        };

        //Returns a string if no command
        function removeCommentsAndSpaces(command) {
            var s = command.split('(')[0].split(';')[0]; //No need to use regex
            return s.split(' ').join('').split('\t').join('');
        }

        //Parsing the result of GParser.parse
        function parseParsedGCode(parsed) {
            var obj = {};
            var i = 0;
            var w1 = "", w2 = "";
            var tab = [];
            var emptyObj = true;

            for(i=0; i < parsed.words.length; i++) {
                w1 = parsed.words[i][0];
                w2 = parsed.words[i][1];
                if(w1 === "G" || w1 === "M") {
                    if(emptyObj === false) {
                        tab.push(obj);
                        obj = {};
                    }
                    obj.type = w1 + w2;
                    emptyObj = false;
                } else  {
                    obj[w1.toLowerCase()] = parseFloat(w2, 10);
                }
            }
            tab.push(obj);
            return tab;
        }

        function setLines() {
            var i = 0, j = 0, commandNumber = 0;
            var line = {}, res = {};  //RESult
            var start = { x: 0, y : 0, z : 0 };
            var tabRes = [];
            var crossAxe = "z";
            var relative = false;

            that.lines= [];

            if(that.cncConfiguration.initialPosition !== undefined) {
                start = {
                    x : that.cncConfiguration.initialPosition.x,
                    y : that.cncConfiguration.initialPosition.y,
                    z : that.cncConfiguration.initialPosition.z
                };
            }

            for(i=0; i < that.gcode.length; i++) {
                //Sorry for not being really readable :'(
                tabRes = parseParsedGCode(
                    GParser.parse(
                        removeCommentsAndSpaces(that.gcode[i]).toUpperCase()
                    )
                );

                for(j = 0; j < tabRes.length; j++) {
                    res = tabRes[j];
                    if(res.type === "G0" || res.type === "G1") {
                        line = new GCodeViewer.StraightLine(
                                    commandNumber, start, res, relative);
                        that.lines.push(line);
                        start = GCodeViewer.copyObject(line.end);
                    } else if(res.type === "G2" || res.type === "G3") {
                        line = new GCodeViewer.CurvedLine(
                                commandNumber, start, res, relative, crossAxe);
                        if(line.center === false) {
                            displayError("Radius too short "+
                                    "for command " + that.gcode[i] + " (line " +
                                    i +")"
                                    );
                            break;
                        }
                        that.lines.push(line);
                        start = GCodeViewer.copyObject(line.end);
                    } else if(res.type === "G4") {
                        console.log("Set pause so continue");
                        // continue;  //Add the pause time somewhere?
                    } else if(res.type === "G17") {
                        crossAxe = "z";
                    } else if(res.type === "G18") {
                        crossAxe = "y";
                    } else if(res.type === "G19") {
                        crossAxe = "z";
                    } else if(res.type === "G20") {
                        console.log("set inches");
                    } else if(res.type === "G21") {
                        console.log("set mm");
                    } else if(res.type === "G90") {
                        relative = false;
                        console.log("set absolute");
                    } else if(res.type === "G91") {
                        relative = true;
                        console.log("set relative");
                    } else if(res.type === "M4") {
                        console.log("set spin on");
                    } else if(res.type === "M8") {
                        console.log("set spin off");
                    } else if(res.type === "M30") {
                        break;
                    }

                    commandNumber++;
                }
            }
        }

        that.setGCode = function(string) {
            if(string === "") {
                displayError("There is no GCode");
                return;
            }
            that.gcode = string.split('\n');
            setLines();
            that.path.remove();  //Removing old stuff
            that.path.setMeshes(that.lines);
            that.refreshDisplay();  //To avoid confusion, we remove everything
        };

        that.hidePaths = function() {
            that.path.remove();
            that.refreshDisplay();
        };

        //Have to set the gcode before
        that.viewPaths = function() {
            that.path.remove();  //Don't know how to check if already in scene
            that.path.add();
            that.refreshDisplay();
        };

        //TODO: delete that
        that.printLines = function() {
            var i = 0;
            var l = {};
            for(i = 0; i < that.lines.length; i++) {
                l = that.lines[i];
                console.log("("+l.start.x+"; "+l.start.y+"; "+l.start.z+") => ("+l.end.x+"; "+l.end.y+"; "+l.end.z+")");

            }
        };
        that.createCircle = function(radius, segments) {
            var material = new THREE.LineBasicMaterial({ color: 0xffffff });
            var circleGeometry = new THREE.CircleGeometry(radius, segments);
            that.circleGeometry = circleGeometry;
            return new THREE.Line(circleGeometry , material);
        };

        that.testBezier = function() {
            var start = {x : 0, y : 0, z : 0};
            var end = {x : 10, y : 15, z : 5};
            var crossAxe = "z";
            var radius = -20;
            var result = { r : radius, x : end.x, y : end.y, z : end.z,
                type : "G2"};
            that.lines.push(new GCodeViewer.CurvedLine(0, start, result, false,
                        crossAxe));

            that.path.setMeshes(that.lines);

            var circle = that.createCircle(20, 32);
            circle.position.z = 10;
            that.scene.add(circle);

            var circle2 = that.createCircle(20, 32);
            circle2.position.z = 0;
            that.scene.add(circle2);
        };

        that.test = function() {
            that.testBezier();

            that.refreshDisplay();
        };

        function initialize() {
            //Members declaration
            that.renderer = {};
            that.camera = {};
            that.scene = {};
            that.controls = {};
            that.lines = [];  //Represents the paths of the bit (lines are straight or curve).
            that.cncConfiguration= {};
            that.gcode = [];

            that.cameraSet = false;

            var width = window.innerWidth, height = window.innerHeight;

            that.cncConfiguration = configuration;

            if(domElement === undefined || domElement === null) {
                that.renderer = new THREE.WebGLRenderer({antialias: true});
                that.renderer.setSize(width, height);
                document.body.appendChild(that.renderer.domElement);
            } else {
                that.renderer = new THREE.WebGLRenderer({
                    canvas: domElement,
                    antialias: true
                });
                width = parseInt(domElement.width, 10);
                height = parseInt(domElement.height, 10);
            }
            // that.renderer.setClearColor( 0xf0f0f0 );
            that.renderer.setPixelRatio( window.devicePixelRatio );

            that.scene = new THREE.Scene();
            // that.setPerspectiveCamera();
            that.setOrthographicCamera();
            that.showZ();

            var light = new THREE.PointLight( 0xffffff, 0.8 );
            light.position.set(0, 1, 1);
            that.scene.add( light );

            that.helpers = new GCodeViewer.Helpers(that.scene);
            that.showBoard();
            that.refreshDisplay();

            that.path = new GCodeViewer.Path(that.scene);

            that.callbackError = callbackError;
            // that.setCameraControl();
        }

        initialize();
    }  //    function Viewer(configuration, domElement)

    return Viewer;
}());

/*jslint todo: true, browser: true, continue: true, white: true*/
/*global THREE, GParser, GCodeViewer */

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

/**
 * This file contains the class managing the viewer. This the class that the
 * user will instantiate.
 */

GCodeViewer.Viewer = (function() {
    "use strict";
    function Viewer(configuration, domElement) {
        //TODO: Mettre tout le reste ici
        var that = this;

        function animate() {
            window.requestAnimationFrame(that.animate);
            that.controls.update();
        }

        function render() {
            that.renderer.render(that.scene, that.camera);
        }

        function resetPathsGeo() {
            console.log(that.geoG0Undone);
            that.geoG0Undone = new THREE.Geometry();
            console.log(that.geoG0Undone);
            that.geoG1Undone = new THREE.Geometry();
            that.geoG2G3Undone = new THREE.Geometry();
            that.geoG0Done = new THREE.Geometry();
            that.geoG1Done = new THREE.Geometry();
            that.geoG2G3Done = new THREE.Geometry();
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

        //Total size on XY plane
        function resetTotalSize() {
            that.totalSize = { min : {x:0, y:0, z:0}, max : {x:0, y:0, z:0} };
        }

        function checkTotalSize(boundingBox) {
            var keys = ["x", "y", "z"];
            var i = 0;
            if(boundingBox === null) {
                return;
            }
            for(i = keys.length - 1; i >= 0; i--) {
                if(that.totalSize.min[keys[i]] > boundingBox.min[keys[i]]) {
                    that.totalSize.min[keys[i]] = boundingBox.min[keys[i]];
                }
                if(that.totalSize.max[keys[i]] < boundingBox.max[keys[i]]) {
                    that.totalSize.max[keys[i]] = boundingBox.max[keys[i]];
                }
            }
        }

        function updateTotalSize() {
            resetTotalSize();
            if(that.meshG0Undone.geometry.vertices.length > 0) {
                that.meshG0Undone.geometry.computeBoundingBox();
                checkTotalSize(that.meshG0Undone.geometry.boundingBox);
            }
            if(that.meshG1Undone.geometry.vertices.length > 0) {
                that.meshG1Undone.geometry.computeBoundingBox();
                checkTotalSize(that.meshG1Undone.geometry.boundingBox);
            }
            if(that.meshG2G3Undone.geometry.vertices.length > 0) {
                that.meshG2G3Undone.geometry.computeBoundingBox();
                checkTotalSize(that.meshG2G3Undone.geometry.boundingBox);
            }
            if(that.meshG0Done.geometry.vertices.length > 0) {
                that.meshG0Done.geometry.computeBoundingBox();
                checkTotalSize(that.meshG0Done.geometry.boundingBox);
            }
            if(that.meshG1Done.geometry.vertices.length > 0) {
                that.meshG1Done.geometry.computeBoundingBox();
                checkTotalSize(that.meshG1Done.geometry.boundingBox);
            }
            if(that.meshG2G3Done.geometry.vertices.length > 0) {
                that.meshG2G3Done.geometry.computeBoundingBox();
                checkTotalSize(that.meshG2G3Done.geometry.boundingBox);
            }
        }

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

        //TODO: rename
        function setGeometriesFromLines() {
            var i = 0, j = 0;
            var geometry = new THREE.Geometry();

            if(that.lines.length === 0) {
                return;
            }

            //TODO: test, lines will store only instances
            for(i=0; i < that.lines.length; i++) {
                if(that.lines[i].type === that.STRAIGHT) {
                    geometry = that.lines[i].getGeometry();
                    // geometry = that.getGeometryStraightLine(that.lines[i]);
                    if(that.lines[i].word === "G0") {
                        that.geoG0Undone.merge(geometry);
                    } else {
                        that.geoG1Undone.merge(geometry);
                    }
                } else if(that.lines[i].type === that.CURVE) {
                    geometry = that.lines[i].getGeometry();
                    // geometry = that.getGeometryCurveLine(that.lines[i]);
                    that.geoG2G3Undone.vertices.push(geometry.vertices[0]);
                    for(j=1; j < geometry.vertices.length-1; j++) {
                        that.geoG2G3Undone.vertices.push(geometry.vertices[j]);
                        that.geoG2G3Undone.vertices.push(geometry.vertices[j]);
                    }
                    if(geometry.vertices.length > 1) {
                        that.geoG2G3Undone.vertices.push(
                            geometry.vertices[geometry.vertices.length - 1]
                        );
                    }

                }
            }
        }

        //TODO: part of the refactor and thinking part
        that.showLines = function() {
            resetPathsGeo();
            setGeometriesFromLines();

            that.meshG0Undone = new THREE.Line(that.geoG0Undone,
                    that.matG0Undone, THREE.LinePieces);
            that.meshG1Undone = new THREE.Line(that.geoG1Undone,
                    that.matG1Undone, THREE.LinePieces);
            that.meshG2G3Undone = new THREE.Line(that.geoG2G3Undone,
                    that.matG2G3Undone, THREE.LinePieces);
            that.meshG0Done = new THREE.Line(that.geoG0Done,
                    that.matG0Done, THREE.LinePieces);
            that.meshG1Done = new THREE.Line(that.geoG1Done,
                    that.matG1Done, THREE.LinePieces);
            that.meshG2G3Done = new THREE.Line(that.geoG2G3Done,
                    that.matG2G3Done, THREE.LinePieces);

            that.scene.add(that.meshG0Undone);
            that.scene.add(that.meshG1Undone);
            that.scene.add(that.meshG2G3Undone);
            that.scene.add(that.meshG0Done);
            that.scene.add(that.meshG1Done);
            that.scene.add(that.meshG2G3Done);
        };

        that.hideLines = function() {
            that.scene.remove(that.meshG0Undone);
            that.scene.remove(that.meshG1Undone);
            that.scene.remove(that.meshG2G3Undone);
            that.scene.remove(that.meshG0Done);
            that.scene.remove(that.meshG1Done);
            that.scene.remove(that.meshG2G3Done);
        };

        that.showArrowsHelp = function() {
            var length = 3, headLength = 1, headWidth = 1;
            var options = {'font' : 'helvetiker','weight' : 'normal',
                'style' : 'normal','size' : 2,'curveSegments' : 300};

            //For X
            var dir = new THREE.Vector3(1, 0, 0);
            var origin = new THREE.Vector3(0, -1.5, 0);
            var hex = 0xff0000;
            var arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex,
                    headLength, headWidth);
            that.scene.add(arrowHelper);

            var material = new THREE.MeshBasicMaterial({ color: hex });
            var textShapes = THREE.FontUtils.generateShapes("X", options);
            var geo = new THREE.ShapeGeometry(textShapes);
            var obj = new THREE.Mesh(geo, material);
            obj.position.x = origin.x + length + 1;
            obj.position.y = origin.y - options.size/2;
            obj.position.z = origin.z;
            that.scene.add(obj);

            //For Y
            dir = new THREE.Vector3(0, 1, 0);
            origin = new THREE.Vector3(-1.5, 0, 0);
            hex = 0x00ff00;
            arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex,
                    headLength, headWidth);
            that.scene.add(arrowHelper);

            material = new THREE.MeshBasicMaterial({ color: hex });
            textShapes = THREE.FontUtils.generateShapes("Y", options);
            geo = new THREE.ShapeGeometry(textShapes);
            obj = new THREE.Mesh(geo, material);
            obj.position.x = origin.x - options.size/2;
            obj.position.y = origin.y + length + 1;
            obj.position.z = origin.z;
            that.scene.add(obj);

            //For Z
            dir = new THREE.Vector3(0, 0, 1);
            origin = new THREE.Vector3(-1.5, -1.5, 0);
            hex = 0x0000ff;
            arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex,
                    headLength, headWidth);
            that.scene.add(arrowHelper);

            material = new THREE.MeshBasicMaterial({ color: hex });
            textShapes = THREE.FontUtils.generateShapes("Z", options);
            geo = new THREE.ShapeGeometry(textShapes);
            obj = new THREE.Mesh(geo, material);
            obj.position.x = origin.x - options.size/2;
            obj.position.y = origin.y;
            obj.position.z = origin.z + length + 1;
            obj.rotateX(Math.PI / 2);
            that.scene.add(obj);
        };

        that.hideArrowHelp = function() {
            console.log("Hide arrows");
        };

        //TODO: rename showHelpers?
        that.setHelpers = function() {
            that.showArrowsHelp();
            that.scene.add(new THREE.AxisHelper(100));
        };
        that.hideHelpers = function() {
            console.log("Hide helpers");
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

        that.setGCode = function(string) {
            that.gcode = string.split('\n');
        };

        // function createGrid() {
        //     var size = 10;
        //     var step = 1;
        //     var gridHelper = new THREE.GridHelper(size, step);
        //     return gridHelper;
        // }

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

        //TODO: rename this function and put away the show of the paths.
        //  And manage the commands correctly
        //Have to set the gcode before
        that.viewPaths = function() {
            var i = 0, j = 0, commandNumber = 0;
            var line = {}, res = {};  //RESult
            var start = { x: 0, y : 0, z : 0 };
            var tabRes = [];
            var crossAxe = "z";
            var relative = false;

            that.hideLines();
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
                        line = new GCodeViewer.StraightLine(
                                commandNumber, start, res, relative, crossAxe);
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

            that.showLines();
            that.showBoard();
            updateTotalSize();

            render();
            animate();
        };  //viewPaths

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
            // console.log(that.circleGeometry);
            return new THREE.Line(circleGeometry , material);
        };

        that.testBezier = function() {
            // var i = 0, j = 0;
            // var b= {}, g = {}, c = {};
            // var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );

            var start = that.createPoint(0, 0, 0);
            var end = that.createPoint(10, 15, 5);
            var clockwise = true;
            var crossAxe = "z";
            var r = -20;
            var center = that.findCenter(start, end, r, clockwise, crossAxe);

            // console.log(center);
            that.lines.push({
                "type": that.CURVE,
                "start": { x : start.x, y : start.y, z : start.z },
                "end": { x : end.x, y : end.y, z : end.z },
                "center": { x : center.x, y : center.y, z : center.z },
                "clockwise" : clockwise,
                "crossAxe" : crossAxe
            });

            that.showLines();

            var circle = that.createCircle(20, 32);
            circle.position.z = 10;
            that.scene.add(circle);

            var circle2 = that.createCircle(20, 32);
            circle2.position.z = 0;
            that.scene.add(circle2);
        };

        that.testMerge = function() {
            // var meshs = [];
            var mat1 = new THREE.LineBasicMaterial( { color : 0xff0000 } );
            var mat2 = new THREE.LineBasicMaterial( { color : 0x00ff00 } );
            var group = new THREE.Geometry();
            var group2 = new THREE.Geometry();
            var geo = {};
            var i = 0;
            for(i=0; i < 1000; i++) {
                geo = new THREE.BoxGeometry(i, i, i);
                // geo = new THREE.CircleGeometry(i, 32);
                // group.merge(geo);
                if(i % 2 === 0) {
                    group.merge(geo);
                    // meshs.push(new THREE.Line(geo, mat1));
                } else {
                    group2.merge(geo);
                    // meshs.push(new THREE.Line(geo, mat2));
                }
                // that.scene.add(meshs[i]);
            }
            that.scene.add(new THREE.Line(group, mat1));
            that.scene.add(new THREE.Line(group2, mat2));
        };

        that.testGeometry = function() {
            var w = 1, l = 3, h = 2;
            var sphere = new THREE.BoxGeometry(w, l, h);
            var material = new THREE.MeshBasicMaterial(0xff0000);
            material.transparent = true;
            material.opacity = 0;
            var object = new THREE.Mesh( sphere, material);
            object.position.x = w / 2;
            object.position.y = l / 2;
            object.position.z = h / 2;

            var box = new THREE.BoundingBoxHelper( object );
            that.scene.add(object);
            that.scene.add( box );
            that.box = box;
            that.object = object;
            console.log("ji");
        };

        that.test = function() {
            that.testGeometry();

            render();
            animate();
        };

        function initialize() {
            //Members declaration
            that.renderer = {};
            that.camera = {};
            that.scene = {};
            that.controls = {};
            that.lines = [];  //Represents the paths of the bit (lines are straight or curve).
            that.pathMesh = {};  // The mesh of the total path
            that.cncConfiguration= {};
            that.gcode = [];
            // that.relative = false;  //Relative or absolute position

            // that.STRAIGHT = 0;
            // that.CURVE = 1;
            // that.crossAxe = "z";
            that.totalSize = { min : {x:0, y:0, z:0}, max : {x:0, y:0, z:0} };

            that.geoG0Undone = new THREE.Geometry();
            that.geoG1Undone = new THREE.Geometry();
            that.geoG2G3Undone = new THREE.Geometry();
            that.geoG0Done = new THREE.Geometry();
            that.geoG1Done = new THREE.Geometry();
            that.geoG2G3Done = new THREE.Geometry();

            that.matG0Undone = new THREE.LineDashedMaterial( { color : 0x8877dd, dashSize : 7 } );
            that.matG1Undone = new THREE.LineBasicMaterial( { color : 0xffffff } );
            that.matG2G3Undone = new THREE.LineBasicMaterial( { color : 0xffffff } );
            that.matG0Done = new THREE.LineDashedMaterial( { color : 0x8877dd, dashSize : 2 } );
            that.matG1Done = new THREE.LineBasicMaterial( { color : 0xff0000 } );
            that.matG2G3Done = new THREE.LineBasicMaterial( { color : 0xee6699 } );

            that.meshG0Undone = {};
            that.meshG1Undone = {};
            that.meshG2G3Undone = {};
            that.meshG0Done = {};
            that.meshG1Done = {};
            that.meshG2G3Done = {};

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

            that.setHelpers();
            render();
            animate();

            // that.setCameraControl();
        }

        initialize();
    }  //    function Viewer(configuration, domElement)

    return Viewer;
}());

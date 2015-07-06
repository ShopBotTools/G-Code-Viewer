/*jslint todo: true, browser: true, continue: true, white: true*/
/*global THREE, GParser */

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

var GCodeViewer = (function () {
    "use strict";
    function GCodeViewer(configuration, domElement) {
        var that = this;

        that.animate = function() {
            window.requestAnimationFrame(that.animate);
            that.controls.update();
        };

        that.render = function() {
            that.renderer.render(that.scene, that.camera);
        };

        //Convert a coordinate where z is the up direction to a coordinate where
        // y is the up direction
        that.zUpToyUp = function(point) {
            return { x : point.y, y : point.z, z : point.x};
        };

        //Convert a coordinate where y is the up direction to a coordinate where
        // z is the up direction
        that.yUpTozUp = function(point) {
            return { x : point.z, y : point.x, z : point.y };
        };

        //Careful, we use Z as up, THREE3D use Y as up
        that.addStraightTo = function(point) {
            var p = that.zUpToyUp(point);
            that.lines.push({
                "type": that.STRAIGHT,
                "point": { x : p.x, y : p.y, z : p.z }
            });
        };

        that.swapObjects = function(obj1, obj2) {
            var keys = Object.keys(obj1);
            var temp;
            var i = 0;
            for(i = 0; i < keys.length; i++) {
                temp = obj1[keys[i]];
                obj1[keys[i]] = obj2[keys[i]];
                obj2[keys[i]] = temp;
            }
        };

        //Simple cubic Bézier curve interpolation clockwise on XY plane
        //angle in radian included in [0; pi/2]
        //radius > 0
        //From Richard A DeVeneza's work
        that.simCubBezInt = function(angle, radius) {
            var p0 = {}, p1 = {}, p2 ={}, p3 = {};
            angle = Math.abs(angle);
            if(angle === Math.PI / 2) {
                p0 = {
                    x : 0.707106781186548 * radius,  //cos(PI/4) == sin(PI/4)
                    y : 0.707106781186548 * radius  //But JS doesn't believe it
                };
            } else {
                p0 = {
                    x : Math.cos(angle/2) * radius,
                    y : Math.sin(angle/2) * radius
                };
            }
            p1 = {
                x : (4 - p0.x) / 3,
                y : (1 - p0.x) * (3 - p0.x) / (3 * p0.y)
            };
            p2 = { x : p1.x, y : -p1.y };
            p3 = { x : p0.x, y : -p0.y };
            return { p0 : p0, p1 : p1, p2 : p2, p3 : p3 };
        };

        //Transforme a simple cubic Bézier's curve clockwise on XY plane
        // to a Bézier's curve in 3D with the right crossAxe and clock direction
        that.simCubBezTo3D = function(curve, start, angle, crossAxe) {
            if(angle < 0) {
                that.swapObjects(curve.p0, curve.p3);
                that.swapObjects(curve.p1, curve.p2);
            }
            //TODO: rotations and stuff
        };

        //angle in radian
        that.arcToBezier = function(start, end, angle, radius, crossAxe) {
            // var arc90 = {}, arcLittle = {};  //Arc = pi/2 and arc < pi/2
            var arcs = [];
            var num90 = 0, numLittle = 1;  //Number arc = pi/2 and arc < pi/2
            var bezier90 = {}, bezierLittle = {};

            if(Math.abs(angle) > Math.PI / 2) {
                num90 = Math.abs(angle) / (Math.PI/2);
                numLittle = Math.abs(angle) % (Math.PI / 2);
            }

            if(num90 > 0) {
                bezier90 = that.simCubBezInt(Math.PI, radius);
            }
            if(numLittle > 0) {
                bezierLittle = that.simCubBezInt(angle, radius);
            }
            //TODO continue to return an array of good Bezier's curves
        };

        //TODO: rename
        that.getGeometryFromLines = function() {
            var i = 0;
            var geometry = new THREE.Geometry();
            if(that.lines.length === 0) {
                return geometry;
            }
            geometry.vertices.push(new THREE.Vector3(0, 0, 0));
            for(i=0; i < that.lines.length; i++) {
                if(that.lines[i].type === that.STRAIGHT) {
                    geometry.vertices.push(new THREE.Vector3(
                                that.lines[i].point.x,
                                that.lines[i].point.y,
                                that.lines[i].point.z)
                            );
                }
                //TODO: do for the curves
            }
            return geometry;
        };

        that.showLines = function() {
            var material = new THREE.LineBasicMaterial({ color : 0xffffff });
            var geometry = that.getGeometryFromLines();

            that.pathMesh = new THREE.Line(geometry, material);
            that.scene.add(that.pathMesh);
        };

        that.hideLines = function() {
            that.scene.remove(that.pathMesh);
        };

        that.setGCode = function(string) {
            that.gcode = string.split('\n');
        };

        that.createGrid = function() {
            var size = 10;
            var step = 1;

            var gridHelper = new THREE.GridHelper(size, step);
            return gridHelper;
        };

        //Returns a string if no command
        that.removeCommentsAndSpaces = function(command) {
            var s = command.split('(')[0].split(';')[0]; //No need to use regex
            return s.split(' ').join('').split('\t').join('');
        };

        //Parsing the result of GParser.parse
        that.parseParsedGCode = function(parsed) {
            var obj = {};
            var i = 0;
            var w1 = "", w2 = "";

            for(i=0; i < parsed.words.length; i++) {
                w1 = parsed.words[i][0];
                w2 = parsed.words[i][1];
                if(w1 === "G" || w2 === "M") {
                    obj.type = w1 + w2;
                } else  {
                    obj[w1.toLowerCase()] = parseFloat(w2, 10);
                }
            }

            return obj;
        };

        //Have to set the gcode before
        that.viewPaths = function() {
            var i = 0;
            var end = { x:0, y:0, z:0 };
            var result = {};

            for(i=0; i < that.gcode.length; i++) {
                //Sorry for not being really readable :'(
                result = that.parseParsedGCode(
                    GParser.parse(
                        that.removeCommentsAndSpaces(that.gcode[i])
                    )
                );

                if(result.type === "G0" || result.type === "G1") {
                    end.x = (typeof result.x === "undefined") ? end.x : result.x;
                    end.y = (typeof result.y === "undefined") ? end.y : result.y;
                    end.z = (typeof result.z === "undefined") ? end.z : result.z;

                    that.addStraightTo(end);
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
        };

        //TODO: delete that
        that.createCircle = function(radius, segments) {
            var material = new THREE.LineBasicMaterial({
                color: 0xffffff
            });

            var i = 0;
            var circleGeometry = new THREE.CircleGeometry(radius, segments);
            var geo = new THREE.Geometry();
            for (i=1; i < circleGeometry.vertices.length; i++) {
                geo.vertices.push(circleGeometry.vertices[i].clone());
            }

            return new THREE.Line(geo, material);
        };

        that.test = function() {
            var radius = 10;
            var pts1 = that.simCubBezInt(Math.PI / 2, radius);
            var pts2 = that.simCubBezInt(Math.PI / 3, radius);
            var pts3 = that.simCubBezInt(Math.PI / 4, radius);
            // var pts2 = that.simCubBezInt(Math.PI / 2, 20);
            var c1 = new THREE.CubicBezierCurve3(
                    new THREE.Vector3(pts1.p0.x, pts1.p0.y, 0),
                    new THREE.Vector3(pts1.p1.x, pts1.p1.y, 0),
                    new THREE.Vector3(pts1.p2.x, pts1.p2.y, 0),
                    new THREE.Vector3(pts1.p3.x, pts1.p3.y, 0)
                    );
            var c2 = new THREE.CubicBezierCurve3(
                    new THREE.Vector3(pts2.p0.x, pts2.p0.y, 0),
                    new THREE.Vector3(pts2.p1.x, pts2.p1.y, 0),
                    new THREE.Vector3(pts2.p2.x, pts2.p2.y, 0),
                    new THREE.Vector3(pts2.p3.x, pts2.p3.y, 0)
                    );
            var c3 = new THREE.CubicBezierCurve3(
                    new THREE.Vector3(pts3.p0.x, pts3.p0.y, 0),
                    new THREE.Vector3(pts3.p1.x, pts3.p1.y, 0),
                    new THREE.Vector3(pts3.p2.x, pts3.p2.y, 0),
                    new THREE.Vector3(pts3.p3.x, pts3.p3.y, 0)
                    );
            // var c2 = new THREE.CubicBezierCurve3(
            //         new THREE.Vector3(pts2.p0.x, pts2.p0.y, 10),
            //         new THREE.Vector3(pts2.p1.x, pts2.p1.y, 10),
            //         new THREE.Vector3(pts2.p2.x, pts2.p2.y, 10),
            //         new THREE.Vector3(pts2.p3.x, pts2.p3.y, 10)
            //         );

            var g1 = new THREE.Geometry();
            g1.vertices = c1.getPoints( 50 );
            var g2 = new THREE.Geometry();
            g2.vertices = c2.getPoints( 50 );
            var g3 = new THREE.Geometry();
            g3.vertices = c3.getPoints( 50 );
            // var g2 = new THREE.Geometry();
            // g2.vertices = c2.getPoints( 50 );

            var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );


            var circle = that.createCircle(radius, 32);
            circle.position.x = 5;
            that.scene.add(circle);
            that.scene.add(new THREE.Line(g1, material));
            that.scene.add(new THREE.Line(g2, material));
            that.scene.add(new THREE.Line(g3, material));
            // that.scene.add(new THREE.Line(g2, material));

            // that.addStraightTo({x:0,y:0,z:-1});
            // that.addStraightTo({x:1,y:1,z:-1});
            // that.addStraightTo({x:1,y:1,z:2});
            // that.addStraightTo({x:0,y:0,z:2});
            // that.addStraightTo({x:0,y:0,z:0});

            that.addStraightTo(that.yUpTozUp({x:pts1.p0.x, y:pts1.p0.y, z:0}));
            that.addStraightTo(that.yUpTozUp({x:pts1.p3.x, y:pts1.p3.y, z:0}));
            that.showLines();

            that.scene.add(that.createGrid());
            that.render();
            that.animate();
        };

        //Members declaration
        that.renderer = {};
        that.camera = {};
        that.scene = {};
        that.controls = {};
        that.lines = [];  //Represents the paths of the bit (lines are straight or curve).
        that.pathMesh = {};  // The mesh of the total path
        that.cncConfiguration= {};
        that.gcode = [];

        that.STRAIGHT = 0;
        that.CURVE = 1;

        var width = window.innerWidth, height = window.innerHeight;

        that.cncConfiguration = configuration;

        if(typeof domElement === "undefined" || domElement === null) {
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
        that.camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
        that.camera.position.x = -10;
        that.camera.position.y = 10;
        that.camera.position.z = -10;

        var light = new THREE.PointLight( 0xffffff, 0.8 );
        light.position.set(0, 1, 1);
        that.scene.add( light );

        that.controls = new THREE.OrbitControls(that.camera,
                that.renderer.domElement);
        that.controls.damping = 0.2;
        that.controls.addEventListener('change', that.render);
    }

    return GCodeViewer;
})();

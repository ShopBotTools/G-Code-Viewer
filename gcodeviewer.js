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

        that.copyObject = function(destination, source) {
            var keys = Object.keys(obj1);
            var i = 0;
            for(i = 0; i < keys.length; i++) {
                destination[keys[i]] = source[keys[i]];
            }
        };

        that.movePoint = function(point, vector) {
            var keys = Object.keys(obj1);
            var i = 0;
            for(i = 0; i < keys.length; i++) {
                point[keys[i]] += vector[keys[i]];
            }
        };

        that.dotProduct2 = function(v1, v2) {
            return v1.x * v2.x + v1.y * v2.y;
        };

        that.crossProduct2 = function(v1, v2) {
            return v1.x * v2.y - v2.x * v1.y;
        };

        //Do a rotation and scale of point according to center and store
        // the result in newPoint. re and im for axes Real and Imaginary
        // angle is in radian
        that.scaleAndRotation = function(center, point, newPoint, angle, length, re, im) {
            var c = center, p = point, nP = newPoint;
            var l = length, cA = Math.cos(angle), sA = Math.sin(angle);

            nP[re] = l * ((p[re] - c[re]) * cA - (p[im] - c[im]) * sA) + c[re];
            nP[im] = l * ((p[im] - c[im]) * cA + (p[re] - c[re]) * sA) + c[im];
        };

        //Returns the signed angle in radian in 2D
        that.findAngleVectors2 = function(v1, v2) {
            var cross = that.crossProduct2(v1, v2);
            var dot = that.dotProduct2(v1, v2);
            var lV1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            var lV2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            if(cross === 0) {
                return 0;
            }
            if(cross < 0) {
                return -Math.acos(dot / (lV1 * lV2));  //For the sign
            }
            return Math.acos(dot / (lV1 * lV2));  //For the sign
        };

        //Careful, we use Z as up, THREE3D use Y as up //NOTE: comment useless?
        //all in absolute
        that.addStraightTo = function(start, end) {
            that.lines.push({
                "type": that.STRAIGHT,
                "start" : { x : start.x, y : start.y, z : start.z },
                "end" : { x : end.x, y : end.y, z : end.z }
            });
        };

        that.addCurveLine = function(start, end, center, clockwise, crossAxe) {
            that.lines.push({
                "type": that.CURVE,
                "start": { x : start.x, y : start.y, z : start.z },
                "end": { x : end.x, y : end.y, z : end.z },
                "center": { x : center.x, y : center.y, z : center.z },
                "clockwise" : clockwise,
                "crossAxe" : crossAxe
            });
        };

        that.findCenter = function(start, end, radius, clockwise, crossAxe) {
            var angle = 0, l = 1, lSE = 0, r = Math.abs(radius), aCSCE = 0;
            var re = "x", im = "y";  //Real and Imaginary axes
            var se = { x : end.x - start.x, y : end.y - start.y,
                z : end.z - start.z
            };
            var center = { x : 0, y : 0, z : 0 };

            if(crossAxe.toLowerCase() === "x") {
                re = "y";
                im = "z";
            } else if(crossAxe.toLowerCase() === "y") {
                re = "z";
                im = "x";
            }

            lSE = Math.sqrt(se[re] * se[re] + se[im] * se[im]);
            angle = Math.acos(lSE / (2 * r));
            l = r / lSE;
            that.scaleAndRotation(start, end, center, angle, l, re, im);
            aCSCE = that.findAngleVectors2(
                { x : start[re] - center[re], y : start[im] - center[im] },
                { x : end[re] - center[re], y : end[im] - center[im] }
            );

            if(clockwise === true) {
                if(radius > 0 && -Math.PI <= aCSCE && aCSCE <= 0) {
                    return center;
                }
                if(radius < 0 && 0 <= aCSCE && aCSCE <= Math.PI) {
                    return center;
                }
            } else {
                if(radius > 0 && 0 <= aCSCE && aCSCE <= Math.PI) {
                    return center;
                }
                if(radius < 0 && -Math.PI <= aCSCE && aCSCE <= 0) {
                    return center;
                }
            }

            that.scaleAndRotation(start, end, center, -angle, l, re, im);
            return center;
        };

        //Simple cubic Bézier curve interpolation clockwise on XY plane
        //angle in radian included in [0; pi/2]
        //radius > 0
        //From Richard A DeVeneza's work
        that.simCubBezInt = function(angle, radius) {
            var p0 = {}, p1 = {}, p2 ={}, p3 = {};
            angle = Math.abs(angle);
            if(angle === Math.PI / 2) {
                //cos(PI/4) == sin(PI/4) but JavaScript doesn't believe it
                p0 = { x : 0.707106781186548, y : 0.707106781186548, z : 0 };
                p1 = { x : 1.097631072937817, y : 0.316582489435277, z : 0 };
            } else {
                p0 = { x : Math.cos(angle/2), y : Math.sin(angle/2), z : 0 };
                p1 = {
                    x : (4 - p0.x) / 3,
                    y : (1 - p0.x) * (3 - p0.x) / (3 * p0.y),
                    z : 0
                };
            }
            p0.x *= radius;
            p0.y *= radius;
            p1.x *= radius;
            p1.y *= radius;
            p2 = { x : p1.x, y : -p1.y, z : 0 };
            p3 = { x : p0.x, y : -p0.y, z : 0 };

            return { p0 : p0, p1 : p1, p2 : p2, p3 : p3 };
        };

        //Transform a simple cubic Bézier's curve clockwise on XY plane
        // to a Bézier's curve in 3D with the right crossAxe and clock direction
        // clockwise is bool
        // pitch can be positive or negative
        that.simCubBezTo3D = function(curve, clockwise, pitch, crossAxe) {
            var height = 0;  //height position for p1, p2 and p3

            if(clockwise === false) {
                that.swapObjects(curve.p0, curve.p3);
                that.swapObjects(curve.p1, curve.p2);
            }

            //NOTE: not sure for the height, maybe this is better:
            // b = p*alpha*(r - ax)*(3*r -ax)/(ay*(4*r - ax)*Math.tan(alpha))
            //Set the good cross axe and transform into a helical Bézier curve
            height = pitch / 3;
            if(crossAxe.toLowerCase() === "z") {
                curve.p0.z = 0;
                curve.p1.z = height;
                curve.p2.z = height * 2;
                curve.p3.z = height * 3;
            } else if(crossAxe.toLowerCase() === "x") {
                curve.p0.z = curve.p0.y;
                curve.p0.y = curve.p0.x;
                curve.p0.x = 0;
                curve.p1.z = curve.p1.y;
                curve.p1.y = curve.p1.x;
                curve.p1.x = height;
                curve.p2.z = curve.p2.y;
                curve.p2.y = curve.p2.x;
                curve.p2.x = height * 2;
                curve.p3.z = curve.p3.y;
                curve.p3.y = curve.p3.x;
                curve.p3.x = height * 3;
            } else if(crossAxe.toLowerCase() === "y") {
                curve.p0.z = curve.p0.x;
                curve.p0.x = curve.p0.y;
                curve.p0.y = 0;
                curve.p1.z = curve.p1.x;
                curve.p1.x = curve.p1.y;
                curve.p1.y = height;
                curve.p2.z = curve.p2.x;
                curve.p2.x = curve.p2.y;
                curve.p2.y = height * 2;
                curve.p3.z = curve.p3.x;
                curve.p3.x = curve.p3.y;
                curve.p3.y = height * 3;
            }

            return curve;
        };

        that.rotAndPlaBez = function(curve, center, angle, re, im) {
            var newPoint = { x : 0, y : 0, z : 0 };
            that.scaleAndRotation({x:0,y:0,z:0}, curve.p0, newPoint, angle,
                    1, re, im);
            that.copyObject(curve.p0, newPoint);
            that.scaleAndRotation({x:0,y:0,z:0}, curve.p1, newPoint, angle,
                    1, re, im);
            that.copyObject(curve.p1, newPoint);
            that.scaleAndRotation({x:0,y:0,z:0}, curve.p2, newPoint, angle,
                    1, re, im);
            that.copyObject(curve.p2, newPoint);
            that.scaleAndRotation({x:0,y:0,z:0}, curve.p3, newPoint, angle,
                    1, re, im);
            that.copyObject(curve.p3, newPoint);

            that.movePoint(curve.p0, center);
            that.movePoint(curve.p1, center);
            that.movePoint(curve.p2, center);
            that.movePoint(curve.p3, center);
        };

        //angle in radian
        that.arcToBezier = function(start, end, angle, radius, crossAxe) {
            // var arc90 = {}, arcLittle = {};  //Arc = pi/2 and arc < pi/2
            var arcs = [];
            var num90 = 0, numLittle = 1;  //Number arc = pi/2 and arc < pi/2
            var bezier90 = {}, bezierLittle = {};
            var i = 0;
            var pitch = 0, p90 = 0, pLittle = 0, pAngle = 0; //Pitch of the arcs

            //Find number of diferent sections
            if(Math.abs(angle) > Math.PI / 2) {
                num90 = Math.abs(angle) / (Math.PI/2);
                numLittle = (Math.abs(angle) % (Math.PI / 2) !== 0) ? 1 : 0;
            }

            //Find pitches
            if(crossAxe.toLowerCase() === "x") {
                pitch = (end.x - start.x);
            } else if(crossAxe.toLowerCase() === "y") {
                pitch = (end.y - start.y);
            } else {
                pitch = (end.z - start.z);
            }
            pAngle = pitch / angle;
            p90 = 90 * pAngle;
            pLittle = (angle - num90 * Math.PI / 2) * pAngle;

            //Find helical Bézier's curves
            if(num90 > 0) {
                bezier90 = that.simCubBezInt(Math.PI, radius);
                that.simCubBezTo3D(bezier90, (angle < 0), p90, crossAxe);
            }
            if(numLittle > 0) {
                bezierLittle = that.simCubBezInt(angle, radius);
                that.simCubBezTo3D(bezierLittle, (angle < 0), pLittle, crossAxe);
            }

            //Rotate and place the arcs
            if(crossAxe.toLowerCase() === "x") {
                for(i = 0; i < num90; i++) {
                    //1 rotate, 2 place the points
                }
            } else if(crossAxe.toLowerCase() === "y") {
            } else {
            }
            //TODO continue to return an array of good Bezier's curves
            //Bézier's curves are not perfect to we place by hand the last point

            //return
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
                //TODO: redo
                // if(that.lines[i].type === that.STRAIGHT) {
                //     geometry.vertices.push(new THREE.Vector3(
                //                 that.lines[i].point.x,
                //                 that.lines[i].point.y,
                //                 that.lines[i].point.z)
                //             );
                // }
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
                if(w1 === "G" || w1 === "M") {
                    obj.type = w1 + w2;
                } else  {
                    obj[w1.toLowerCase()] = parseFloat(w2, 10);
                }
            }

            return obj;
        };

        that.manageG2G3 = function(result, start) {
            var end = { x:0, y:0, z:0 }, center = { x:0, y:0, z:0 };
            var i = 0, j = 0, k = 0;

            end.x = (typeof result.x === "undefined") ? start.x : result.x;
            end.y = (typeof result.y === "undefined") ? start.y : result.y;
            end.z = (typeof result.z === "undefined") ? start.z : result.z;

            if(typeof result.r !== "undefined") {
                center = that.findCenter(start, end, result.r,
                        result.type === "G2", that.crossAxe);
            } else {
                i = (typeof result.i === "undefined") ? 0 : result.i;
                j = (typeof result.j === "undefined") ? 0 : result.j;
                k = (typeof result.k === "undefined") ? 0 : result.k;
                center.x = start.x + i;
                center.y = start.y + j;
                center.z = start.z + k;
            }

            that.addCurveLine(start, end, center, result.type === "G2",
                    that.crossAxe);
            return end;
        };

        //Have to set the gcode before
        that.viewPaths = function() {
            var i = 0;
            var end = { x:0, y:0, z:0 };
            var start = {
                x : that.cncConfiguration.initialPosition.x,
                y : that.cncConfiguration.initialPosition.y,
                z : that.cncConfiguration.initialPosition.z
            };
            var result = {};

            for(i=0; i < that.gcode.length; i++) {
                //Sorry for not being really readable :'(
                result = that.parseParsedGCode(
                    GParser.parse(
                        that.removeCommentsAndSpaces(that.gcode[i])
                    )
                );

                if(result.type === "G0" || result.type === "G1") {
                    end.x= (typeof result.x === "undefined")? start.x : result.x;
                    end.y= (typeof result.y === "undefined")? start.y : result.y;
                    end.z= (typeof result.z === "undefined")? start.z : result.z;

                    that.addStraightTo(start, end);
                    start.x = end.x;
                    start.y = end.y;
                    start.z = end.z;
                } else if(result.type === "G2" || result.type === "G3") {
                    start = that.manageG2G3(result, start);
                } else if(result.type === "G4") {
                    //TODO: look the type and do stuff
                } else if(result.type === "G17") {
                    that.crossAxe = "z";
                } else if(result.type === "G18") {
                    that.crossAxe = "y";
                } else if(result.type === "G19") {
                    that.crossAxe = "z";
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
            var material = new THREE.LineBasicMaterial({ color: 0xffffff });
            var circleGeometry = new THREE.CircleGeometry(radius, segments);
            that.circleGeometry = circleGeometry;
            // console.log(that.circleGeometry);
            return new THREE.Line(circleGeometry , material);
        };

        that.testCenter = function() {
            var radius = -20;
            var clockwise = false;
            var crossAxe = "y";
            var start = { x : 0, y : 0, z : 0 };
            var end = { z : 10, x : 15, y : 0 };
            // var end = { x : 1, y : 0, z : 0 };
            var center = { x : 0, y : 0, z : 0 };
            center = that.findCenter(start, end, radius, clockwise, crossAxe);
            // that.scaleAndRotation(start, end, center, Math.PI/3, 1, "x", "y");
            // console.log(that.findAngleVectors2({x:1, y:0}, {
            console.log(center);

            // that.addStraightTo(center);
            // that.addStraightTo(end);
            // that.showLines();

            var circle = that.createCircle(Math.abs(radius), 32);
            circle.position.x = center.x;
            circle.position.z = center.z;
            circle.rotateX(Math.PI/2);
            that.scene.add(circle);
        };

        that.test = function() {
            that.testCenter();

            // var radius = 10;
            // var pts1 = that.simCubBezInt(Math.PI / 2, radius);
            // var pts2 = that.simCubBezInt(Math.PI / 3, radius);
            // var pts3 = that.simCubBezInt(Math.PI / 4, radius);
            // pts1 = that.simCubBezTo3D(pts1, false, 5, "z");
            // // pts2 = that.simCubBezTo3D(pts2, true, 5, "z");
            // // pts3 = that.simCubBezTo3D(pts3, true, 10, "z");
            // console.log(pts1);
            //
            // var c1 = new THREE.CubicBezierCurve3(
            //         new THREE.Vector3(pts1.p0.x, pts1.p0.y, pts1.p0.z),
            //         new THREE.Vector3(pts1.p1.x, pts1.p1.y, pts1.p1.z),
            //         new THREE.Vector3(pts1.p2.x, pts1.p2.y, pts1.p2.z),
            //         new THREE.Vector3(pts1.p3.x, pts1.p3.y, pts1.p3.z)
            //         );
            // var c2 = new THREE.CubicBezierCurve3(
            //         new THREE.Vector3(pts2.p0.x, pts2.p0.y, pts2.p0.z),
            //         new THREE.Vector3(pts2.p1.x, pts2.p1.y, pts2.p1.z),
            //         new THREE.Vector3(pts2.p2.x, pts2.p2.y, pts2.p2.z),
            //         new THREE.Vector3(pts2.p3.x, pts2.p3.y, pts2.p3.z)
            //         );
            // var c3 = new THREE.CubicBezierCurve3(
            //         new THREE.Vector3(pts3.p0.x, pts3.p0.y, pts3.p0.z),
            //         new THREE.Vector3(pts3.p1.x, pts3.p1.y, pts3.p1.z),
            //         new THREE.Vector3(pts3.p2.x, pts3.p2.y, pts3.p2.z),
            //         new THREE.Vector3(pts3.p3.x, pts3.p3.y, pts3.p3.z)
            //         );
            //
            // var g1 = new THREE.Geometry();
            // g1.vertices = c1.getPoints( 50 );
            // var g2 = new THREE.Geometry();
            // g2.vertices = c2.getPoints( 50 );
            // var g3 = new THREE.Geometry();
            // g3.vertices = c3.getPoints( 50 );
            //
            // var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );
            //
            //
            // var circle = that.createCircle(radius, 32);
            // circle.position.z = 5;
            // that.scene.add(circle);
            // that.scene.add(new THREE.Line(g1, material));
            // that.scene.add(new THREE.Line(g2, material));
            // that.scene.add(new THREE.Line(g3, material));
            // // that.scene.add(new THREE.Line(g2, material));
            //
            // that.circle = circle;

            that.scene.add(new THREE.AxisHelper( 100 ));

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
        that.crossAxe = "z";

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

        // that.camera = new THREE.OrthographicCamera( 0.5 * width / - 2, 0.5 * height / 2, height / 2, height / - 2, 150, 1000 );
        // that.scene.add(new THREE.CameraHelper(that.camera));

        that.camera.up = new THREE.Vector3( 0, 0, 1 );
        // that.camera.position.x = -10;
        // that.camera.position.y = -10;
        that.camera.position.z = 10;

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

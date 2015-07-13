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
            var keys = Object.keys(source);
            var i = 0;
            for(i = 0; i < keys.length; i++) {
                destination[keys[i]] = source[keys[i]];
            }
        };

        //Returns a clone of the object
        that.cloneBezier = function(bez) {
            var newBez = { p0 : {}, p1 : {}, p2 : {}, p3 : {} };
            newBez.p0 = { x : bez.p0.x, y : bez.p0.y, z : bez.p0.z };
            newBez.p1 = { x : bez.p1.x, y : bez.p1.y, z : bez.p1.z };
            newBez.p2 = { x : bez.p2.x, y : bez.p2.y, z : bez.p2.z };
            newBez.p3 = { x : bez.p3.x, y : bez.p3.y, z : bez.p3.z };
            return newBez;
        };

        that.movePoint = function(point, vector) {
            var keys = Object.keys(vector);
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

        that.lengthVector = function(v) {
            return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        };

        //I hate typing { and :
        that.createPoint = function(x, y, z) {
            return { x : x, y : y, z : z };
        };

        //Returns object of 3 axes:
        // re is the axes for REal numbers
        // im for the IMaginary numbers
        // cr for the CRoss axe
        that.findAxes = function(crossAxe) {
            if(crossAxe.toLowerCase() === "x") {
                return { re : "y", im : "z", cr : "x"};
            } else if(crossAxe.toLowerCase() === "y") {
                return { re : "z", im : "x", cr : "y"};
            }
            return { re : "x", im : "y", cr : "z"};
        };

        //Do a rotation and scale of point according to center and store
        // the result in newPoint. re and im for axes Real and Imaginary
        // angle is in radian
        // Copy the value of point before doing calculus so point and newPoint
        // can be the same object
        that.scaleAndRotation = function(center, point, newPoint, angle, length, re, im) {
            var c = center, p = point, nP = newPoint;
            var l = length, cA = Math.cos(angle), sA = Math.sin(angle);
            var pRe = p[re], pIm = p[im], cRe = c[re], cIm = c[im];

            nP[re] = l * ((pRe - cRe) * cA - (pIm - cIm) * sA) + cRe;
            nP[im] = l * ((pIm - cIm) * cA + (pRe - cRe) * sA) + cIm;
        };

        //Returns the signed angle in radian in 2D (between -PI and PI)
        that.findAngleVectors2 = function(v1, v2) {
            var cross = that.crossProduct2(v1, v2);
            var dot = that.dotProduct2(v1, v2);
            var lV1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            var lV2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            if(lV1 === 0 || lV2 === 0) {
                return 0;
            }
            if(cross === 0) {
                cross = 1;
            }
            if(cross < 0) {
                return -Math.acos(dot / (lV1 * lV2));  //For the sign
            }
            return Math.acos(dot / (lV1 * lV2));  //For the sign
        };

        that.findAngleOrientedVectors2 = function(v1, v2, positive) {
            var angle =  that.findAngleVectors2(v1, v2);
            console.log("angle find = " + angle);

            if(positive === false && angle > 0) {
                return -(Math.PI * 2 - angle);
            }
            if(positive === true && angle < 0) {
                return Math.PI * 2 + angle;
            }

            return angle;
        };

        // line of type STRAIGHT
        that.getBezierAngle = function(line) {
            var axes = that.findAxes(line.crossAxe);
            var cs = that.createPoint(line.start[axes.re] - line.center[axes.re],
                    line.start[axes.im] - line.center[axes.im], 0);
            var ce = that.createPoint(line.end[axes.re] - line.center[axes.re],
                    line.end[axes.im] - line.center[axes.im], 0);

            return that.findAngleOrientedVectors2(cs, ce,
                    line.clockwise === false);
        };

        that.getBezierRadius = function(line) {
            var axes = that.findAxes(line.crossAxe);
            var cs = that.createPoint(line.start[axes.re] - line.center[axes.re],
                    line.start[axes.im] - line.center[axes.im], 0);
            return that.lengthVector(cs);
        };

        that.getGeometryStraightLine = function(line) {
            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(
                        line.start.x,
                        line.start.y,
                        line.start.z)
            );
            geometry.vertices.push(new THREE.Vector3(
                        line.end.x,
                        line.end.y,
                        line.end.z)
            );

            if(line.word === "G0") {
            var g = geometry;
            console.log("("+g.vertices[0].x+"; "+g.vertices[0].y+"; "+g.vertices[0].z+") => ("+g.vertices[1].x+"; "+g.vertices[1].y+"; "+g.vertices[1].z+")");
            console.log("======");
            }

            return geometry;
        };

        that.getGeometryCurveLine = function(line) {
            var i = 0, j = 0;
            var bez = that.arcToBezier(line);
            var p0 = {}, p1 = {}, p2 = {}, p3 = {}, c = {};
            var v = [];
            var geometry = new THREE.Geometry();

            console.log("Bez length: " + bez.length);
            for(i=0; i < bez.length; i++) {
                p0 = new THREE.Vector3(bez[i].p0.x, bez[i].p0.y, bez[i].p0.z);
                p1 = new THREE.Vector3(bez[i].p1.x, bez[i].p1.y, bez[i].p1.z);
                p2 = new THREE.Vector3(bez[i].p2.x, bez[i].p2.y, bez[i].p2.z);
                p3 = new THREE.Vector3(bez[i].p3.x, bez[i].p3.y, bez[i].p3.z);
                c = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
                v = c.getPoints(32);

                for(j=0; j < v.length; j++) {
                    geometry.vertices.push(v[j]);
                }
            }
            return geometry;
        };

        //Careful, we use Z as up, THREE3D use Y as up //NOTE: comment useless?
        //all in absolute
        that.addStraightLine = function(start, end, word) {
            that.lines.push({
                "type": that.STRAIGHT,
                "word" : word,
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

        //radius is positive or negative
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
            console.log(height + " " + pitch);
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
            var c = { x : 0, y : 0, z : 0 };
            that.scaleAndRotation(c, curve.p0, curve.p0, angle, 1, re, im);
            that.scaleAndRotation(c, curve.p1, curve.p1, angle, 1, re, im);
            that.scaleAndRotation(c, curve.p2, curve.p2, angle, 1, re, im);
            that.scaleAndRotation(c, curve.p3, curve.p3, angle, 1, re, im);

            that.movePoint(curve.p0, center);
            that.movePoint(curve.p1, center);
            that.movePoint(curve.p2, center);
            that.movePoint(curve.p3, center);
        };

        // The Bézier's curve must be on the good plane
        // that.getFullBezier = function(start, center, num90, bez90, numSmall, bezSmall, re, im) {
        that.getFullBezier = function(line, num90, bez90, numSmall, bezSmall) {
            var arcs = [];
            var axes = that.findAxes(line.crossAxe);
            var start = line.start, center = line.center;
            var re = axes.re, im = axes.im;
            var cs = { x : start[re] - center[re], y : start[im] - center[im] };
            //TODO: clean stuff
            var i = 0, angle = 0, sign = (line.clockwise === true) ? -1 : 1;

            if(num90 === 0 && numSmall === 0) {
                return arcs;
            }

            if(num90 > 0) {
                angle = that.findAngleOrientedVectors2(
                    { x : bez90.p0[re], y : bez90.p0[im] }, cs,
                    line.clockwise === false
                );

                for(i = 0; i < num90; i++) {
                    arcs.push(that.cloneBezier(bez90));
                    that.rotAndPlaBez(arcs[i], center, angle, re, im);
                    // angle = i * Math.PI / 2 + Math.PI / 4;
                    // angle = i * 1.570796326794897 + 0.785398163397448;
                    angle += 1.570796326794897 * sign;
                }
            }

            if(numSmall > 0) {
                angle = that.findAngleOrientedVectors2(
                    { x : bezSmall.p0[re], y : bezSmall.p0[im] }, cs,
                    line.clockwise === false
                );

                if(num90 !== 0) {
                    angle += num90 * 1.570796326794897 * sign;
                }
                arcs.push(that.cloneBezier(bezSmall));
                that.rotAndPlaBez(arcs[i], center, angle, re, im);
            }

            return arcs;
        };

        //angle in radian
        that.arcToBezier = function(line) {
            var crossAxe = line.crossAxe;
            var num90 = 0, numSmall = 1;  //Number arc = pi/2 and arc < pi/2
            var bez90 = {}, bezSmall = {};
            var p90 = 0, pLittle = 0, pAngle = 0; //Pitch of the arcs

            var angle = that.getBezierAngle(line);
            console.log("Angle = " + angle);
            var radius = that.getBezierRadius(line);

            if(angle === 0 || radius === 0) {
                return [];
            }

            //Find number of diferent sections
            if(Math.abs(angle) > Math.PI / 2) {
                //Untrustful (as this language) function, should be tested
                num90 = parseInt(Math.abs(angle) / (Math.PI/2), 10);
                numSmall = (Math.abs(angle) % (Math.PI / 2) !== 0) ? 1 : 0;
            }

            //Find pitches
            pAngle = (line.end[crossAxe] - line.start[crossAxe]) / angle;
            p90 = Math.PI / 2 * pAngle;
            pLittle = (angle - num90 * Math.PI / 2) * pAngle;
            console.log(line.end[crossAxe] - line.start[crossAxe]);
            console.log(angle);

            //Find helical Bézier's curves
            if(num90 > 0) {
                bez90 = that.simCubBezInt(Math.PI / 2, radius);
                that.simCubBezTo3D(bez90, (angle < 0), p90, crossAxe);
            // return [bez90]; //TODO: delete that
            }
            if(numSmall > 0) {
                angle = Math.abs(angle) - num90 * Math.PI / 2;
                if(line.clockwise === true) {
                    angle = -angle;
                }
                bezSmall = that.simCubBezInt(angle, radius);
                that.simCubBezTo3D(bezSmall, (angle < 0), pLittle, crossAxe);
            }

            return that.getFullBezier(line, num90, bez90, numSmall, bezSmall);
        };

        //TODO: rename
        that.setGeometriesFromLines = function() {
            var i = 0;
            var geometry = new THREE.Geometry();

            if(that.lines.length === 0) {
                return;
            }

            // var j = that.lines.length - 1;
            for(i=0; i < that.lines.length; i++) {
            // for(i=j; i < j+1; i++) {
                if(that.lines[i].type === that.STRAIGHT) {
                    geometry = that.getGeometryStraightLine(that.lines[i]);
                    if(that.lines[i].word === "G0") {
                        that.geoG0Undone.merge(geometry);
                    } else {
                        that.geoG1Undone.merge(geometry);
                    }
                } else if(that.lines[i].type === that.CURVE) {
                    geometry = that.getGeometryCurveLine(that.lines[i]);
                    that.geoG2G3Undone.merge(geometry);
                }
            }
        };

        that.showLines = function() {
            that.setGeometriesFromLines();

            that.meshG0Undone = new THREE.Line(that.geoG0Undone, that.matG0Undone);
            that.meshG1Undone = new THREE.Line(that.geoG1Undone, that.matG1Undone);
            that.meshG2G3Undone = new THREE.Line(that.geoG2G3Undone, that.matG2G3Undone);
            that.meshG0Done = new THREE.Line(that.geoG0Done, that.matG0Done);
            that.meshG1Done = new THREE.Line(that.geoG1Done, that.matG1Done);
            that.meshG2G3Done = new THREE.Line(that.geoG2G3Done, that.matG2G3Done);
            that.scene.add(that.meshG0Undone);
            that.scene.add(that.meshG1Undone);
            that.scene.add(that.meshG2G3Undone);
            that.scene.add(that.meshG0Undone);
            that.scene.add(that.meshG1Undone);
            that.scene.add(that.meshG2G3Undone);
        };

        that.hideLines = function() {
            that.scene.remove(that.meshG0Undone);
            that.scene.remove(that.meshG1Undone);
            that.scene.remove(that.meshG2G3Undone);
            that.scene.remove(that.meshG0Undone);
            that.scene.remove(that.meshG1Undone);
            that.scene.remove(that.meshG2G3Undone);
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
            console.log(result);

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

        //TODO: rename this function and put away the show of the paths.
        //  And manage the commands correctly
        //Have to set the gcode before
        that.viewPaths = function() {
            var i = 0;
            var end = { x:0, y:0, z:0 };
            var result = {};
            var start = { x: 0, y : 0, z : 0 };
            if(typeof that.cncConfiguration.initialPosition !== "undefined") {
                start = {
                    x : that.cncConfiguration.initialPosition.x,
                    y : that.cncConfiguration.initialPosition.y,
                    z : that.cncConfiguration.initialPosition.z
                };
            }

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

                    that.addStraightLine(start, end, result.type);
                    start.x = end.x;
                    start.y = end.y;
                    start.z = end.z;
                } else if(result.type === "G2" || result.type === "G3") {
                    start = that.manageG2G3(result, start);
                } else if(result.type === "G4") {
                    console.log("Set pause so continue");
                    // continue;  //Add the pause time somewhere?
                } else if(result.type === "G17") {
                    that.crossAxe = "z";
                } else if(result.type === "G18") {
                    that.crossAxe = "y";
                } else if(result.type === "G19") {
                    that.crossAxe = "z";
                } else if(result.type === "G20") {
                    console.log("set inches");
                } else if(result.type === "G21") {
                    console.log("set mm");
                } else if(result.type === "G90") {
                    console.log("set absolute");
                } else if(result.type === "G91") {
                    console.log("set relative");
                } else if(result.type === "M4") {
                    console.log("set spin on");
                } else if(result.type === "M8") {
                    console.log("set spin off");
                } else if(result.type === "M30") {
                    break;
                }
            }

            that.showLines();
            that.scene.add(new THREE.AxisHelper( 100 ));
            that.printLines();

            that.render();
            that.animate();
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
            // console.log(that.circleGeometry);
            return new THREE.Line(circleGeometry , material);
        };

        that.testBezier = function() {
            var i = 0, j = 0;
            var b= {}, g = {}, c = {};
            var material = new THREE.LineBasicMaterial( { color : 0xff0000 } );

            var start = that.createPoint(0, 0, 0);
            var end = that.createPoint(15, 0, 10);
            var clockwise = false;
            var crossAxe = "z";
            var r = -20;
            var center = that.findCenter(start, end, r, clockwise, crossAxe);

            console.log(center);
            that.lines.push({
                "type": that.CURVE,
                "start": { x : start.x, y : start.y, z : start.z },
                "end": { x : end.x, y : end.y, z : end.z },
                "center": { x : center.x, y : center.y, z : center.z },
                "clockwise" : clockwise,
                "crossAxe" : crossAxe
            });

            for(i = 0; i < that.lines.length; i++) {
                g = that.getGeometryCurveLine(that.lines[i]);
                that.scene.add(new THREE.Line(g, material));

                // console.log(that.lines[i]);

                // b = that.arcToBezier(that.lines[i]);
                // for (j = 0; j < b.length; j++) {
                //     c = new THREE.CubicBezierCurve3(
                //         new THREE.Vector3(b[j].p0.x, b[j].p0.y, b[j].p0.z),
                //         new THREE.Vector3(b[j].p1.x, b[j].p1.y, b[j].p1.z),
                //         new THREE.Vector3(b[j].p2.x, b[j].p2.y, b[j].p2.z),
                //         new THREE.Vector3(b[j].p3.x, b[j].p3.y, b[j].p3.z)
                //     );
                //     g = new THREE.Geometry();
                //     g.vertices = c.getPoints( 50 );
                //     that.scene.add(new THREE.Line(g, material));
                // }

            }

            var circle = that.createCircle(20, 32);
            circle.position.z = 10;
            that.scene.add(circle);

            var circle2 = that.createCircle(20, 32);
            circle2.position.z = 0;
            that.scene.add(circle2);
        };

        that.testMerge = function() {

            var meshs = [];
            var mat1 = new THREE.LineBasicMaterial( { color : 0xff0000 } );
            var mat2 = new THREE.LineBasicMaterial( { color : 0x00ff00 } );
            var group = new THREE.Geometry();
            var group2 = new THREE.Geometry();
            var geo = {};
            var i = 0;
            for(i=0; i < 1000; i++) {
                geo = new THREE.CircleGeometry(i, 32);
                // group.merge(geo);
                if(i % 2 === 0) {
                    group.merge(geo);
                    meshs.push(new THREE.Line(geo, mat1));
                } else {
                    group2.merge(geo);
                    meshs.push(new THREE.Line(geo, mat2));
                }
                // that.scene.add(meshs[i]);
            }
            that.scene.add(new THREE.Line(group, mat1));
            that.scene.add(new THREE.Line(group2, mat2));
        };

        that.test = function() {
            that.testBezier();

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

        that.geoG0Undone = new THREE.Geometry();
        that.geoG1Undone = new THREE.Geometry();
        that.geoG2G3Undone = new THREE.Geometry();
        that.geoG0Done = new THREE.Geometry();
        that.geoG1Done = new THREE.Geometry();
        that.geoG2G3Done = new THREE.Geometry();

        that.matG0Undone = new THREE.LineDashedMaterial( { color : 0x8877dd } );
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

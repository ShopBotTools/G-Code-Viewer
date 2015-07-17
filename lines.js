/*jslint todo: true, browser: true, continue: true, white: true*/
/*global THREE, GParser, GCodeViewer */

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

/**
 * This file contains the classes managing the lines. The lines are
 * the representation of the G0, G1, G2 and G3 commands.
 */

GCodeViewer.StraightLine = (function() {
    "use strict";

    //TODO: should "throw" an error if bad parameters
    function StraightLine(index, start, commandParsed, relative) {
        var that = this;

        that.getGeometry = function() {
            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(
                        that.start.x,
                        that.start.y,
                        that.start.z)
            );
            geometry.vertices.push(new THREE.Vector3(
                        that.end.x,
                        that.end.y,
                        that.end.z)
            );
            geometry.faces.push(new THREE.Face3(0, 1, 0));  //TODO: delete?

            return geometry;
        };

        function initialize(index, start, commandParsed, relative) {
            that.index = index;
            that.type = GCodeViewer.STRAIGHT;
            that.word = commandParsed.type;
            that.start = { x : start.x, y : start.y, z : start.z };
            that.end = GCodeViewer.findPosition(start, commandParsed, relative);
        }


        initialize(index, start, commandParsed, relative);
    }

    return StraightLine;
}());

GCodeViewer.CurvedLine = (function() {
    "use strict";

    function CurvedLine(index, start, commandParsed, relative, crossAxe) {
        var that = this;

        function getBezierAngle() {
            var axes = GCodeViewer.findAxes(that.crossAxe);
            var cs = { x : that.start[axes.re] - that.center[axes.re],
                y : that.start[axes.im] - that.center[axes.im], z : 0};
            var ce = { x : that.end[axes.re] - that.center[axes.re],
                y : that.end[axes.im] - that.center[axes.im], z : 0};

            return GCodeViewer.findAngleOrientedVectors2(cs, ce,
                    that.clockwise === false);
        }

        function getBezierRadius() {
            var axes = GCodeViewer.findAxes(that.crossAxe);
            var cs = { x : that.start[axes.re] - that.center[axes.re],
                y : that.start[axes.im] - that.center[axes.im], z : 0};
            return GCodeViewer.lengthVector(cs);
        }

        //Simple cubic Bézier curve interpolation clockwise on XY plane
        //angle in radian included in [0; pi/2]
        //radius > 0
        //From Richard A DeVeneza's work
        function simCubBezInt(angle, radius) {
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
        }

        //Transform a simple cubic Bézier's curve clockwise on XY plane
        // to a Bézier's curve in 3D with the right crossAxe and clock direction
        // clockwise is bool
        // pitch can be positive or negative
        function simCubBezTo3D(curve, clockwise, pitch, crossAxe) {
            var height = 0;  //height position for p1, p2 and p3

            if(clockwise === false) {
                GCodeViewer.swapObjects(curve.p0, curve.p3);
                GCodeViewer.swapObjects(curve.p1, curve.p2);
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
        }

        function rotAndPlaBez(curve, center, angle, re, im) {
            var c = { x : 0, y : 0, z : 0 };
            GCodeViewer.scaleAndRotation(c,curve.p0,curve.p0, angle, 1, re, im);
            GCodeViewer.scaleAndRotation(c,curve.p1,curve.p1, angle, 1, re, im);
            GCodeViewer.scaleAndRotation(c,curve.p2,curve.p2, angle, 1, re, im);
            GCodeViewer.scaleAndRotation(c,curve.p3,curve.p3, angle, 1, re, im);

            GCodeViewer.movePoint(curve.p0, center);
            GCodeViewer.movePoint(curve.p1, center);
            GCodeViewer.movePoint(curve.p2, center);
            GCodeViewer.movePoint(curve.p3, center);
        }

        // The Bézier's curve must be on the good plane
        function getFullBezier(num90, bez90, numSmall, bezSmall, pitch90) {
            var arcs = [];
            var center = GCodeViewer.copyObject(that.center);
            var axes = GCodeViewer.findAxes(that.crossAxe);
            var re = axes.re, im = axes.im;
            var cs = { x : that.start[re] - center[re],
                y : that.start[im] - center[im] };
            //TODO: clean stuff
            var i = 0, angle = 0, sign = (that.clockwise === true) ? -1 : 1;

            if(num90 === 0 && numSmall === 0) {
                return arcs;
            }

            if(num90 > 0) {
                angle = GCodeViewer.findAngleOrientedVectors2(
                    { x : bez90.p0[re], y : bez90.p0[im] }, cs,
                    that.clockwise === false
                );

                for(i = 0; i < num90; i++) {
                    arcs.push(GCodeViewer.copyObject(bez90));
                    rotAndPlaBez(arcs[i], center, angle, re, im);
                    // angle += Math.PI / 2 * sign;
                    angle += 1.570796326794897 * sign;
                    center[that.crossAxe] += pitch90;
                }
            }

            if(numSmall > 0) {
                angle = GCodeViewer.findAngleOrientedVectors2(
                    { x : bezSmall.p0[re], y : bezSmall.p0[im] }, cs,
                    that.clockwise === false
                );

                if(num90 !== 0) {
                    angle += num90 * 1.570796326794897 * sign;
                }
                arcs.push(GCodeViewer.copyObject(bezSmall));
                rotAndPlaBez(arcs[i], center, angle, re, im);
            }

            //To be sure the last point is at the end
            arcs[arcs.length-1].p3.x = that.end.x;
            arcs[arcs.length-1].p3.y = that.end.y;
            arcs[arcs.length-1].p3.z = that.end.z;

            return arcs;
        }

        function arcToBezier() {
            var num90 = 0, numSmall = 1;  //Number arc = pi/2 and arc < pi/2
            var bez90 = {}, bezSmall = {};
            var p90 = 0, pLittle = 0, pAngle = 0; //Pitch of the arcs
            var angle = getBezierAngle(), radius = getBezierRadius();
            var absAngle = Math.abs(angle), halfPI = 1.570796326794897;


            if(angle === 0 || radius === 0) {
                return [];
            }

            //Find number of diferent sections
            if(absAngle > halfPI) {
                //Untrustful (as this language) function, should be tested:
                num90 = parseInt(absAngle / halfPI, 10);
                numSmall = (absAngle % halfPI !== 0) ? 1 : 0;
            }

            //Find pitches
            pAngle = (that.end[that.crossAxe] - that.start[that.crossAxe]) / absAngle;
            p90 = halfPI * pAngle;
            pLittle = (absAngle - num90 * halfPI) * pAngle;

            //Find helical Bézier's curves
            if(num90 > 0) {
                bez90 = simCubBezInt(halfPI, radius);
                simCubBezTo3D(bez90, (angle < 0), p90, that.crossAxe);
            }
            if(numSmall > 0) {
                angle = absAngle - num90 * halfPI;
                if(that.clockwise === true) {
                    angle = -angle;
                }
                bezSmall = simCubBezInt(angle, radius);
                simCubBezTo3D(bezSmall, (angle < 0), pLittle, that.crossAxe);
            }

            return getFullBezier(num90, bez90, numSmall, bezSmall, p90);
        }

        that.getGeometry = function() {
            var i = 0, j = 0;
            var bez = arcToBezier();
            var p0 = {}, p1 = {}, p2 = {}, p3 = {}, c = {};
            var v = [];
            var geometry = new THREE.Geometry();

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

        //radius is positive or negative
        function findCenter(start, end, commandParsed, clockwise, crossAxe) {
            if(commandParsed.r === undefined) {
                var center = { x : start.x, y : start.y, z : start.z };
                if(commandParsed.i !== undefined) {
                    center.x += commandParsed.i;
                }
                if(commandParsed.j !== undefined) {
                    center.y += commandParsed.j;
                }
                if(commandParsed.k !== undefined) {
                    center.z += commandParsed.k;
                }
                return center;
            }
            return GCodeViewer.findCenter(start, end, commandParsed.r,
                    clockwise,crossAxe);
        }

        function initialize(index, start, commandParsed, relative, crossAxe) {
            that.index = index;
            that.type = GCodeViewer.CURVED;
            that.word = commandParsed.type;
            that.start = { x : start.x, y : start.y, z : start.z };
            that.end = GCodeViewer.findPosition(start, commandParsed, relative);
            that.clockwise = (commandParsed.type === "G2");
            that.center = findCenter(start, that.end, commandParsed,
                    that.clockwise, crossAxe);
            that.crossAxe = crossAxe;
        }

        initialize(index, start, commandParsed, relative, crossAxe);
    }

    return CurvedLine;
}());

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
            geometry.faces.push(new THREE.Face3(0, 1, 0));

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

// GCodeViewer.CurvedLine = (function() {
//     "use strict";
//
//     function CurvedLine(index, start, commandParsed, relative, crossAxe) {
//         var that = this;
//
        // // line of type STRAIGHT
        // that.getBezierAngle = function(line) {
        //     var axes = that.findAxes(line.crossAxe);
        //     var cs = that.createPoint(line.start[axes.re] - line.center[axes.re],
        //             line.start[axes.im] - line.center[axes.im], 0);
        //     var ce = that.createPoint(line.end[axes.re] - line.center[axes.re],
        //             line.end[axes.im] - line.center[axes.im], 0);
        //
        //     return that.findAngleOrientedVectors2(cs, ce,
        //             line.clockwise === false);
        // };
        //
        // that.getBezierRadius = function(line) {
        //     var axes = that.findAxes(line.crossAxe);
        //     var cs = that.createPoint(line.start[axes.re] - line.center[axes.re],
        //             line.start[axes.im] - line.center[axes.im], 0);
        //     return that.lengthVector(cs);
        // };
        // //Simple cubic Bézier curve interpolation clockwise on XY plane
        // //angle in radian included in [0; pi/2]
        // //radius > 0
        // //From Richard A DeVeneza's work
        // that.simCubBezInt = function(angle, radius) {
        //     var p0 = {}, p1 = {}, p2 ={}, p3 = {};
        //     angle = Math.abs(angle);
        //     if(angle === Math.PI / 2) {
        //         //cos(PI/4) == sin(PI/4) but JavaScript doesn't believe it
        //         p0 = { x : 0.707106781186548, y : 0.707106781186548, z : 0 };
        //         p1 = { x : 1.097631072937817, y : 0.316582489435277, z : 0 };
        //     } else {
        //         p0 = { x : Math.cos(angle/2), y : Math.sin(angle/2), z : 0 };
        //         p1 = {
        //             x : (4 - p0.x) / 3,
        //             y : (1 - p0.x) * (3 - p0.x) / (3 * p0.y),
        //             z : 0
        //         };
        //     }
        //     p0.x *= radius;
        //     p0.y *= radius;
        //     p1.x *= radius;
        //     p1.y *= radius;
        //     p2 = { x : p1.x, y : -p1.y, z : 0 };
        //     p3 = { x : p0.x, y : -p0.y, z : 0 };
        //
        //     return { p0 : p0, p1 : p1, p2 : p2, p3 : p3 };
        // };
        //
        // //Transform a simple cubic Bézier's curve clockwise on XY plane
        // // to a Bézier's curve in 3D with the right crossAxe and clock direction
        // // clockwise is bool
        // // pitch can be positive or negative
        // that.simCubBezTo3D = function(curve, clockwise, pitch, crossAxe) {
        //     var height = 0;  //height position for p1, p2 and p3
        //
        //     if(clockwise === false) {
        //         that.swapObjects(curve.p0, curve.p3);
        //         that.swapObjects(curve.p1, curve.p2);
        //     }
        //
        //     //NOTE: not sure for the height, maybe this is better:
        //     // b = p*alpha*(r - ax)*(3*r -ax)/(ay*(4*r - ax)*Math.tan(alpha))
        //     //Set the good cross axe and transform into a helical Bézier curve
        //     height = pitch / 3;
        //     if(crossAxe.toLowerCase() === "z") {
        //         curve.p0.z = 0;
        //         curve.p1.z = height;
        //         curve.p2.z = height * 2;
        //         curve.p3.z = height * 3;
        //     } else if(crossAxe.toLowerCase() === "x") {
        //         curve.p0.z = curve.p0.y;
        //         curve.p0.y = curve.p0.x;
        //         curve.p0.x = 0;
        //         curve.p1.z = curve.p1.y;
        //         curve.p1.y = curve.p1.x;
        //         curve.p1.x = height;
        //         curve.p2.z = curve.p2.y;
        //         curve.p2.y = curve.p2.x;
        //         curve.p2.x = height * 2;
        //         curve.p3.z = curve.p3.y;
        //         curve.p3.y = curve.p3.x;
        //         curve.p3.x = height * 3;
        //     } else if(crossAxe.toLowerCase() === "y") {
        //         curve.p0.z = curve.p0.x;
        //         curve.p0.x = curve.p0.y;
        //         curve.p0.y = 0;
        //         curve.p1.z = curve.p1.x;
        //         curve.p1.x = curve.p1.y;
        //         curve.p1.y = height;
        //         curve.p2.z = curve.p2.x;
        //         curve.p2.x = curve.p2.y;
        //         curve.p2.y = height * 2;
        //         curve.p3.z = curve.p3.x;
        //         curve.p3.x = curve.p3.y;
        //         curve.p3.y = height * 3;
        //     }
        //
        //     return curve;
        // };
        //
        // that.rotAndPlaBez = function(curve, center, angle, re, im) {
        //     var c = { x : 0, y : 0, z : 0 };
        //     that.scaleAndRotation(c, curve.p0, curve.p0, angle, 1, re, im);
        //     that.scaleAndRotation(c, curve.p1, curve.p1, angle, 1, re, im);
        //     that.scaleAndRotation(c, curve.p2, curve.p2, angle, 1, re, im);
        //     that.scaleAndRotation(c, curve.p3, curve.p3, angle, 1, re, im);
        //
        //     that.movePoint(curve.p0, center);
        //     that.movePoint(curve.p1, center);
        //     that.movePoint(curve.p2, center);
        //     that.movePoint(curve.p3, center);
        // };
        //
        // // The Bézier's curve must be on the good plane
        // that.getFullBezier = function(line, num90, bez90, numSmall, bezSmall, pitch90) {
        //     var arcs = [];
        //     var axes = that.findAxes(line.crossAxe);
        //     var start = line.start, center = line.center;
        //     var re = axes.re, im = axes.im;
        //     var cs = { x : start[re] - center[re], y : start[im] - center[im] };
        //     //TODO: clean stuff
        //     var i = 0, angle = 0, sign = (line.clockwise === true) ? -1 : 1;
        //
        //     if(num90 === 0 && numSmall === 0) {
        //         return arcs;
        //     }
        //
        //     if(num90 > 0) {
        //         angle = that.findAngleOrientedVectors2(
        //             { x : bez90.p0[re], y : bez90.p0[im] }, cs,
        //             line.clockwise === false
        //         );
        //
        //         for(i = 0; i < num90; i++) {
        //             arcs.push(that.cloneBezier(bez90));
        //             that.rotAndPlaBez(arcs[i], center, angle, re, im);
        //             // angle += Math.PI + sign;
        //             angle += 1.570796326794897 * sign;
        //             center[line.crossAxe] += pitch90;
        //         }
        //     }
        //
        //     if(numSmall > 0) {
        //         angle = that.findAngleOrientedVectors2(
        //             { x : bezSmall.p0[re], y : bezSmall.p0[im] }, cs,
        //             line.clockwise === false
        //         );
        //
        //         if(num90 !== 0) {
        //             angle += num90 * 1.570796326794897 * sign;
        //         }
        //         arcs.push(that.cloneBezier(bezSmall));
        //         that.rotAndPlaBez(arcs[i], center, angle, re, im);
        //     }
        //
        //     //To be sure the last point is at the end
        //     arcs[arcs.length-1].p3.x = line.end.x;
        //     arcs[arcs.length-1].p3.y = line.end.y;
        //     arcs[arcs.length-1].p3.z = line.end.z;
        //
        //     return arcs;
        // };

//         //radius is positive or negative
//         function findCenter(start, end, commandParsed, clockwise, crossAxe) {
//             var center = { x : 0, y : 0, z : 0 };
//
//             if(typeof commandParsed.r === "undefined") {
//                 center = { x : start.x, y : start.y, z : start.z };
//                 if(typeof commandParsed.i !== "undefined") {
//                     center.x += commandParsed.i;
//                 }
//                 if(typeof commandParsed.j !== "undefined") {
//                     center.y += commandParsed.j;
//                 }
//                 if(typeof commandParsed.k !== "undefined") {
//                     center.z += commandParsed.k;
//                 }
//                 return center;
//             }
//             var radius = commandParsed.r;
//
//             var angle = 0, l = 1, lSE = 0, r = Math.abs(radius), aCSCE = 0;
//             var re = "x", im = "y";  //Real and Imaginary axes
//             var se = { x : end.x - start.x, y : end.y - start.y,
//                 z : end.z - start.z
//             };
//
//             if(crossAxe.toLowerCase() === "x") {
//                 re = "y";
//                 im = "z";
//             } else if(crossAxe.toLowerCase() === "y") {
//                 re = "z";
//                 im = "x";
//             }
//
//             lSE = Math.sqrt(se[re] * se[re] + se[im] * se[im]);
//             angle = Math.acos(lSE / (2 * r));
//             l = r / lSE;
//             GCodeViewer.scaleAndRotation(start, end, center, angle, l, re, im);
//             aCSCE = GCodeViewer.findAngleVectors2(
//                 { x : start[re] - center[re], y : start[im] - center[im] },
//                 { x : end[re] - center[re], y : end[im] - center[im] }
//             );
//
//             if(clockwise === true) {
//                 if(radius > 0 && -Math.PI <= aCSCE && aCSCE <= 0) {
//                     return center;
//                 }
//                 if(radius < 0 && 0 <= aCSCE && aCSCE <= Math.PI) {
//                     return center;
//                 }
//             } else {
//                 if(radius > 0 && 0 <= aCSCE && aCSCE <= Math.PI) {
//                     return center;
//                 }
//                 if(radius < 0 && -Math.PI <= aCSCE && aCSCE <= 0) {
//                     return center;
//                 }
//             }
//
//             GCodeViewer.scaleAndRotation(start, end, center, -angle, l, re, im);
//             return center;
//         }
//
//         function arcToBezier() {
//             var crossAxe = line.crossAxe;
//             var num90 = 0, numSmall = 1;  //Number arc = pi/2 and arc < pi/2
//             var bez90 = {}, bezSmall = {};
//             var p90 = 0, pLittle = 0, pAngle = 0; //Pitch of the arcs
//
//             var angle = that.getBezierAngle(line);
//             var radius = that.getBezierRadius(line);
//
//             if(angle === 0 || radius === 0) {
//                 return [];
//             }
//
//             //Find number of diferent sections
//             if(Math.abs(angle) > Math.PI / 2) {
//                 //Untrustful (as this language) function, should be tested
//                 num90 = parseInt(Math.abs(angle) / (Math.PI/2), 10);
//                 numSmall = (Math.abs(angle) % (Math.PI / 2) !== 0) ? 1 : 0;
//             }
//
//             //Find pitches
//             pAngle = (line.end[crossAxe] - line.start[crossAxe]) / Math.abs(angle);
//             p90 = Math.PI / 2 * pAngle;
//             pLittle = (Math.abs(angle) - num90 * Math.PI / 2) * pAngle;
//
//             //Find helical Bézier's curves
//             if(num90 > 0) {
//                 bez90 = that.simCubBezInt(Math.PI / 2, radius);
//                 that.simCubBezTo3D(bez90, (angle < 0), p90, crossAxe);
//             }
//             if(numSmall > 0) {
//                 angle = Math.abs(angle) - num90 * Math.PI / 2;
//                 if(line.clockwise === true) {
//                     angle = -angle;
//                 }
//                 bezSmall = that.simCubBezInt(angle, radius);
//                 that.simCubBezTo3D(bezSmall, (angle < 0), pLittle, crossAxe);
//             }
//
//             return that.getFullBezier(line, num90, bez90, numSmall, bezSmall, p90);
//         }
//
//         that.getGeometry = function() {
//             var i = 0, j = 0;
//             var bez = arcToBezier();
//             var p0 = {}, p1 = {}, p2 = {}, p3 = {}, c = {};
//             var v = [];
//             var geometry = new THREE.Geometry();
//
//             for(i=0; i < bez.length; i++) {
//                 p0 = new THREE.Vector3(bez[i].p0.x, bez[i].p0.y, bez[i].p0.z);
//                 p1 = new THREE.Vector3(bez[i].p1.x, bez[i].p1.y, bez[i].p1.z);
//                 p2 = new THREE.Vector3(bez[i].p2.x, bez[i].p2.y, bez[i].p2.z);
//                 p3 = new THREE.Vector3(bez[i].p3.x, bez[i].p3.y, bez[i].p3.z);
//                 c = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
//                 v = c.getPoints(32);
//
//                 for(j=0; j < v.length; j++) {
//                     geometry.vertices.push(v[j]);
//                 }
//             }
//             return geometry;
//         };
//
//         function initialize(index, start, commandParsed, relative, crossAxe) {
//             that.index = index;
//             that.type = GCodeViewer.CURVED;
//             that.word = commandParsed.type;
//             that.start = { x : start.x, y : start.y, z : start.z };
//             that.end = GCodeViewer.findPosition(start, commandParsed, relative);
//             that.clockwise = (commandParsed.type === "G2");
//             that.center = findCenter(start, end, commandParsed, that.clockwise,
//                     crossAxe);
//             that.crossAxe = crossAxe;
//         }
//
//         initialize(index, start, commandParsed, relative, crossAxe);
//     }
//
//     return CurvedLine;
// }());

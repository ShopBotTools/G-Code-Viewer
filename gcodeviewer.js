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

        that.test = function() {
            that.addStraightTo({x:0,y:0,z:-1});
            that.addStraightTo({x:1,y:1,z:-1});
            that.addStraightTo({x:1,y:1,z:2});
            that.addStraightTo({x:0,y:0,z:2});
            that.addStraightTo({x:0,y:0,z:0});
            that.showLines();

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

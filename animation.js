/*jslint todo: true, browser: true, continue: true, white: true*/
/*global THREE, GCodeViewer, GCodeToGeometry*/

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

/**
 * This file contains the class managing the animation of the bit.
 */

//refresFunction is the function to refresh the display/render the scene
//speeds are in inches by minutes (feedrate)
GCodeViewer.Animation = function(scene, refreshFunction, gui, normalSpeed,
        fastSpeed) {
    //TODO: integrate the initial position management by using the position
    //of the meshes
    "use strict";
    var that = this;

    var lengthBit = 3;

    that.show = function() {
        that.scene.add(that.bit);
        that.refreshFunction();
    };

    that.hide = function() {
        that.scene.remove(that.bit);
        that.refreshFunction();
    };

    //If that.animating become private
    that.isAnimating = function() {
        return that.animating;
    };

    function nearlyEqual(a, b) {
        return Math.floor(a * 1000) === Math.floor(b * 1000);
    }

    function samePosition(posA, posB) {
        return (nearlyEqual(posA.x, posB.x) && nearlyEqual(posA.y, posB.y) && 
            nearlyEqual(posA.z, posB.z));
    }

    function getPositionBit() {
        console.log(that);
        return {
            x : that.bit.position.x,
            y : that.bit.position.y,
            z : that.bit.position.z - lengthBit / 2,
        };
    }

    function setPositionBit(point) {
        that.bit.position.set(point.x, point.y, point.z + lengthBit / 2);
    }

    function moveBit(vector) {
        var pos = getPositionBit();
        pos.x += vector.x;
        pos.y += vector.y;
        pos.z += vector.z;
        setPositionBit(pos);
    }

    // //TODO: delete
    // function printVector(name, vector) {
    //     console.log(name + " = { x : "+vector.x+", y : "+vector.y+", z : "+vector.z+" }");
    // }

    //Give the move to do
    function deltaSpeed(position, destination, speed, deltaTime) {
        // console.log(speed + " * " + deltaTime);
        speed = speed * deltaTime;
        var dX = destination.x - position.x;
        var dY = destination.y - position.y;
        var dZ = destination.z - position.z;
        // printVector("position", position);
        // printVector("destination", destination);
        // console.log("speed: " + speed);

        var length = Math.sqrt(dX * dX + dY * dY + dZ * dZ);

        if(length === 0) {
            return { x : dX, y : dY, z : dZ };
        }

        var move = {
            x : dX / length * speed,
            y : dY / length * speed,
            z : dZ / length * speed
        };

        // printVector("move", move);
        if(GCodeToGeometry.lengthVector3(move) > length) {
            return { x : dX, y : dY, z : dZ };
        }
        return move;
    }

    // that.setLines = function(lines) {
    //     that.lines = lines;
    // };

    //Return true if a path is set (path.length > 0), else false
    function setPath(line) {
        var i = 0;  //It could be deleted and work directly on the iVertexGn
        var vertices = [];
        that.currentPath = [];
        console.log(line);

        //For the while(not start point): the meshes are dashed lines so some
        //vertices appear twice. However, it should not enter in this loop
        if(line.type === "G0") {
            vertices = that.meshes.G0Undone.geometry.vertices;
            i = that.iVertexG0;
            while(vertices[i].x !== line.start.x && vertices[i].y !== line.start.y &&
                    vertices[i].z !== line.start.z) {
                i++;
            }
            while(vertices[i].x !== line.end.x && vertices[i].y !== line.end.y &&
                    vertices[i].z !== line.end.z)
            {
                console.log("pushing");
                console.log(vertices[i]);
                that.currentPath.push(vertices[i]);
                i++;
            }
            that.iVertexG0 = i;
            that.currentSpeed = that.fastSpeed;
            that.currentType = "G0";
        } else if(line.type === "G1") {
            vertices = that.meshes.G1Undone.geometry.vertices;
            i = that.iVertexG1;
            while(vertices[i].x !== line.start.x && vertices[i].y !== line.start.y &&
                    vertices[i].z !== line.start.z) {
                i++;
            }
            while(vertices[i].x !== line.end.x && vertices[i].y !== line.end.y &&
                    vertices[i].z !== line.end.z)
            {
                that.currentPath.push(vertices[i]);
                i++;
            }
            that.iVertexG1 = i;
            that.currentSpeed = that.normalSpeed;
            that.currentType = "G1";
        } else {
            vertices = that.meshes.G2G3Undone.geometry.vertices;
            i = that.iVertexG2G3;
            while(vertices[i].x !== line.start.x && vertices[i].y !== line.start.y &&
                    vertices[i].z !== line.start.z) {
                i++;
            }
            while(vertices[i].x !== line.end.x && vertices[i].y !== line.end.y &&
                    vertices[i].z !== line.end.z)
            {
                that.currentPath.push(vertices[i]);
                i++;
            }
            that.iVertexG2G3 = i;
            that.currentSpeed = that.normalSpeed;
            that.currentType = "G2G3";
        }

        return (that.currentPath > 0);
    }

    //Used to have an smooth animation
    function calculateDeltaTime() {
        var newTime = new Date().getTime();
        var deltaTime = newTime - that.lastTime;
        that.lastTime = newTime;
        return deltaTime;
    }

    function update() {
        if(that.animating === false) {
            return;
        }

        if(that.currentPath.length === 0) {
            that.currentLineIndex++;
            if(that.currentLineIndex >= that.lines.length) {
                that.animating = false;
            } else {
                setPath(that.lines[that.currentLineIndex]);
                that.gui.highlight(that.lines[that.currentLineIndex].lineNumber);
            }
        } else {
            var deltaTime = calculateDeltaTime();
            var move = deltaSpeed(getPositionBit(), that.currentPath[0],
                    that.currentSpeed, deltaTime);
            moveBit(move);
            if(samePosition(getPositionBit(), that.currentPath[0])) {
                that.currentPath.shift();
            }
        }

        that.refreshFunction();
    }

    // returns true if start the animation; false if problem
    that.startAnimation = function(lines, meshes) {
        if(lines === undefined || meshes === undefined) {
            return false;
        }
        that.lines = lines;
        that.meshes = meshes;
        if(lines.length === 0) {
            return false;
        }

        //Index of the vertex of the geometry of the meshes
        that.iVertexG0 = 0;
        that.iVertexG1 = 0;
        that.iVertexG2G3 = 0;

        that.currentLineIndex = 0;
        that.currentType = "";
        setPath(that.lines[that.currentLineIndex]);
        that.gui.highlight(that.lines[that.currentLineIndex].lineNumber);
        console.log(that.currentPath);
        if(that.currentPath.length > 0) {
            setPositionBit(that.currentPath[0]);
        }
        that.refreshFunction();
        that.animating = true;  //Must be at the end

        return true;
    };

    that.stopAnimation = function() {
        that.animating = false;
    };

    function createBit() {
        var geometry = new THREE.CylinderGeometry(0, 1, lengthBit, 32);
        var material = new THREE.MeshBasicMaterial({color: 0xffff00});
        that.bit = new THREE.Mesh(geometry, material);
        that.bit.rotateX(-Math.PI / 2);
        setPositionBit({ x : 0, y : 0, z : 0 });
    }

    //Speed are in inches by minutes. Internally converted it in inches by ms
    function setSpeeds(normalSpeed, fastSpeed) {
        that.normalSpeed = normalSpeed / 360000;
        that.fastSpeed = fastSpeed / 360000;
    }

    //initialize
    that.lines = [];
    that.meshes = {};
    setSpeeds(normalSpeed, fastSpeed);
    that.scene = scene;
    that.refreshFunction = refreshFunction;
    that.gui = gui;
    createBit();

    that.animating = false;
    that.lastTime = new Date().getTime();
    setInterval(update, 41);  //41 = 240 FPS (not a vidya but below it is rough)
};

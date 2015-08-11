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

    //TODO: delete
    function printVector(name, vector) {
        console.log(name + " = { x : "+vector.x+", y : "+vector.y+", z : "+vector.z+" }");
    }

    //Give the move to do
    function deltaSpeed(position, destination, speed, deltaTime) {
        speed = speed * deltaTime;
        var dX = destination.x - position.x;
        var dY = destination.y - position.y;
        var dZ = destination.z - position.z;
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

    //Return true if a and b in the same position
    function pointsEqual(a, b) {
        return (a.x === b.x && a.y === b.y && a.z === b.z);
    }

    //Push in currentPath the vertices starting from the start to the end,
    //i is the index to start searching in the vertices
    //it returns the index of the the end + 1 or -1 if the end or start was not
    //found (so can return i = length if the end was the last vertices)
    function pushVerticesInPath(start, end, vertices, i) {
        if(i >= vertices.length && i < 0) {
            return -1;
        }

        while(i < vertices.length && pointsEqual(start, vertices[i]) === false) {
            i++;
        }
        if(i >= vertices.length) {
            return -1;
        }

        do {
            that.currentPath.push(vertices[i]);
            i++;
        } while(i < vertices.length && pointsEqual(end, vertices[i]) === false);
        if(i >= vertices.length) {
            return -1;
        }
        if(pointsEqual(end, vertices[i]) === true) {
            that.currentPath.push(vertices[i]);
            i++;
        }

        return i;
    }

    //Return true if a path is set (path.length > 0), else false
    function setPath(line) {
        var i = 0;  //It could be deleted and work directly on the iVertexGn
        var vertices = [];
        that.currentPath = [];

        //For the while(not start point): the meshes are dashed lines so some
        //vertices appear twice. However, it should not enter in this loop
        if(line.type === "G0") {
            vertices = that.meshes.G0Undone.geometry.vertices;
            i = that.iVertexG0;
            i = pushVerticesInPath(line.start, line.end, vertices, i);
            that.iVertexG0 = i;
            that.currentSpeed = that.fastSpeed;
            that.currentType = "G0";
        } else if(line.type === "G1") {
            vertices = that.meshes.G1Undone.geometry.vertices;
            i = that.iVertexG1;
            i = pushVerticesInPath(line.start, line.end, vertices, i);
            that.iVertexG1 = i;
            that.currentSpeed = that.normalSpeed;
            that.currentType = "G1";
        } else {
            vertices = that.meshes.G2G3Undone.geometry.vertices;
            i = that.iVertexG2G3;
            i = pushVerticesInPath(line.beziers[0].p0,
                    line.beziers[line.beziers.length - 1].p3, vertices, i);
            that.iVertexG2G3 = i;
            that.currentSpeed = that.normalSpeed;
            that.currentType = "G2G3";
        }

        //I don't test the result of pushVerticesInPath because of the test here:
        return (that.currentPath > 0);
    }

    //TODO: Rename after refactorization
    function setPathFromLines() {
        var i = 0, j = 0;
        that.path = [];
        for(i = 0; i < that.lines.length; i++) {
            setPath(that.lines[i]);
            for(j = 0; j < that.currentPath.length; j++) {
                that.path.push({
                    point : that.currentPath[j],
                    type : that.currentType
                });
            }
        }
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
                if(setPath(that.lines[that.currentLineIndex]) === false) {
                    return;
                }
                that.gui.highlight(that.lines[that.currentLineIndex].lineNumber);
            }
        } else {
            var deltaTime = calculateDeltaTime();
            var move = deltaSpeed(getPositionBit(), that.currentPath[0],
                    that.currentSpeed, deltaTime);
            moveBit(move);
            //Here: send new position
            if(samePosition(getPositionBit(), that.currentPath[0])) {
                //TODO: say to the path class to add this vertice to the done
                if(that.currentType === "G0") {
                    console.log("done G0 vertex");
                } else if(that.currentType === "G1") {
                    console.log("done G1 vertex");
                } else if(that.currentType === "G2G3") {
                    console.log("done G2G3 vertex");
                }
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
        // setPathFromLines();
        // console.log(that.path);
        setPath(that.lines[that.currentLineIndex]);
        that.gui.highlight(that.lines[that.currentLineIndex].lineNumber);
        // console.log(that.currentPath);
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

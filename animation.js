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

    function setPath(line) {
        //TODO: need meshes....
        //that.meshes.GOUndone
        //that.currentPath = ....
        console.log("line = " + line);

        //TODO: do correctly the bottom
        that.currentPath = [ { x : 0, y : 0, z : 0 }, { x : 1, y : 1, z : 1 } ];
        that.currentSpeed = that.fastSpeed;
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
        var deltaTime = calculateDeltaTime();

        //moving the bit
        var move = deltaSpeed(getPositionBit(), that.currentPath[0],
                that.currentSpeed, deltaTime);
        moveBit(move);
        // that.bit.position.x += move.x;
        // that.bit.position.y += move.y;
        // that.bit.position.z += move.z;

        if(samePosition(getPositionBit(), that.currentPath[0]) === true) {
            that.currentPath.shift();
            console.log(that.currentPath);
        }

        if(that.currentPath.length === 0) {
            that.currentLineNumber++;
            if(that.currentLineNumber >= that.lines.length) {
                that.animating = false;
            } else {
                setPath(that.lines[that.currentLineNumber]);
                that.gui.highlight(that.currentLineNumber);
            }
        }

        that.refreshFunction();
    }

    that.startAnimation = function(lines) {
        that.lines = lines;

        //TODO: delete some of the following, here for the tests
        that.lines = [];

        that.currentLineNumber = 0;
        setPath(that.lines[that.currentLineNumber]);
        that.gui.highlight(that.currentLineNumber);
        // console.log(that.currentLineNumber);
        // console.log(that.currentPath);
        setPositionBit(that.currentPath[0]);
        // that.bit.position.x = that.currentPath[0].x;
        // that.bit.position.y = that.currentPath[0].y;
        // that.bit.position.z = that.currentPath[0].z;
        that.refreshFunction();
        that.animating = true;  //Must be at the end
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
    setSpeeds(normalSpeed, fastSpeed);
    that.scene = scene;
    that.refreshFunction = refreshFunction;
    that.gui = gui;
    createBit();

    that.animating = false;
    that.lastTime = new Date().getTime();
    // setInterval(update, 333);  //333 = 30 FPS (not a vidya, no need higher)
    // setInterval(update, 166);  //166 = 60 FPS (not a vidya, no need higher)
    setInterval(update, 41);  //41 = 240 FPS (not a vidya, no need higher)
};

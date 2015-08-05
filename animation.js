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

    //Give the move to do
    function deltaSpeed(position, destination, speed, deltaTime) {
        speed = speed * deltaTime;
        var dX = destination.x - position.x;
        var dY = destination.y - position.y;
        var dZ = destination.z - position.z;
        var length = Math.sqrt(dX * dX + dY * dY + dZ * dZ);
        var move = {
            x : dX / length * speed,
            y : dY / length * speed,
            z : dZ / length * speed
        };

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
        console.log(line);

        that.currentPath = [ { x : 0, y : 0, z : 0 }, { x : 1, y : 1, z : 1 } ];
    }

    //Used to have an smooth animation
    function calculateDeltaTime() {
        var newTime = new Date().getTime();
        var deltaTime = that.lastTime - newTime;
        that.lastTime = newTime;
        return deltaTime;
    }

    function update() {
        if(that.animating === false) {
            return;
        }
        var deltaTime = calculateDeltaTime();

        //moving the bit
        var move = deltaSpeed(that.bit.position, that.currentPath[0],
                that.currentSpeed);

        that.bit.position.x += move.x * deltaTime;
        that.bit.position.y += move.y * deltaTime;
        that.bit.position.z += move.z * deltaTime;

        if(samePosition(that.bit.position, that.currentPath[0]) === true) {
            that.currentPath.shift();
        }

        if(that.currentPath.length() === 0) {
            that.currentLineNumber++;
            if(that.currentLineNumber >= that.lines.length()) {
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
        that.animating = true;  //Must be at the end
    };

    that.stopAnimation = function() {
        that.animating = false;
    };

    function createBit() {
        var geometry = new THREE.CylinderGeometry(0, 1, 3, 32);
        var material = new THREE.MeshBasicMaterial({color: 0xffff00});
        that.bit = new THREE.Mesh(geometry, material);
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
    setInterval(update, 333);  //333 = 30 FPS (not a vidya, no need higher)
};

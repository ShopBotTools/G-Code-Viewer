/*jslint todo: true, browser: true, continue: true, white: true*/
/*global THREE, GParser, GCodeViewer, GCodeToGeometry, dat */

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

/**
 * This file contains the class managing the viewer. This the class that the
 * user will instantiate. This is the main class.
 */

GCodeViewer.Viewer = function(configuration, domElement, callbackError) {
    "use strict";
    var that = this;

    function animate() {
        window.requestAnimationFrame(animate);
        that.controls.update();
    }

    function render() {
        that.renderer.render(that.scene, that.camera);
    }

    that.refreshDisplay = function() {
        render();
        animate();
    };

    function displayError(message) {
        if(that.callbackError !== undefined) {
            that.callbackError(message);
        }
    }

    that.setPerspectiveCamera = function() {
        that.camera.toPerspective();
        that.refreshDisplay();
    };

    that.setOrthographicCamera = function() {
        that.camera.toOrthographic();
        that.refreshDisplay();
    };

    function setCombinedCamera() {
        var width = that.renderer.domElement.width/2; // Camera frustum width.
        var height = that.renderer.domElement.height/2; // Camera frustum height.
        var fov = 75; // Camera frustum vertical field of view in perspective view.
        var near = 0.1; // Camera frustum near plane in perspective view.
        var far = 1000; // Camera frustum far plane in perspective view.
        var orthoNear = -100; // Camera frustum near plane in orthographic view.
        var orthoFar = 100; // Camera frustum far plane in orthographic view.
        that.camera = new THREE.CombinedCamera(width, height, fov, near,
                far, orthoNear, orthoFar);
        that.camera.up.set(0, 0, 1);

        that.controls = new THREE.OrbitControls(that.camera,
                that.renderer.domElement);
        that.controls.damping = 0.2;
        that.controls.addEventListener('change', render);
    }

    //Return the center of the board
    function centerPath() {
        var center = { x : 0, y : 0, z : 0 };
        if(that.gcode.size === undefined) {
            return center;
        }
        var size = that.gcode.size;
        center.x = size.min.x + Math.abs(size.max.x - size.min.x) / 2 ;
        center.y = size.min.y + Math.abs(size.max.y - size.min.y) / 2 ;
        center.z = size.min.z + Math.abs(size.max.z - size.min.z) / 2 ;
        return center;
    }

    //Return the dollIn needed to fit the object according to the axe
    //example: fetch the XY plane, "x" and "y" as parameter, return 1 if no
    // path
    function dollInToFetch(axe1, axe2) {
        if(that.gcode.size === undefined) {
            return 1/5;
        }
        var size = that.gcode.size;
        var distance = 0, width = 0, height = 0, length = 0;
        width = Math.abs(size.max[axe1] - size.min[axe1]);
        height = Math.abs(size.max[axe2] - size.min[axe2]);
        if(width === 0 && height === 0) {
            return 1/5;
        }
        length = (width < height) ? height : width;

        if(that.camera.inPerspectiveMode === true) {
            if(that.camera.fov === 0 || that.camera.fov === 180 || length === 0) {
                return 1 / 5;
            }
            // The following commented operation give the distance, but we want
            // the dollIn (so the inverse of the distance)
            // distance = (length / 2)/Math.tan(that.camera.fov * Math.PI /180);
            distance = Math.tan(that.camera.fov * Math.PI /180)/(length / 2);
        } else {
            var cW = Math.abs(that.camera.right - that.camera.left);
            var cH = Math.abs(that.camera.top - that.camera.bottom);
            distance = Math.min(cW / width, cH / height);
        }

        console.log("Returns distance: " + distance);
        return distance;
    }

    //point to see
    //cameraPosition (the axe for zoom and unzoom should be equal to 1)
    //dollIn value (or zoom value)
    function lookAtPoint(point, camPosition, dollyIn) {
        var pos = that.controls.object.position;
        that.controls.reset();
        pos.set(camPosition.x, camPosition.y, camPosition.z);
        that.controls.target.set(point.x, point.y, point.z);
        that.controls.dollyIn(dollyIn);
        that.refreshDisplay();
    }

    //TODO: fit with the board size
    function showPlane(axeReal, axeImaginary, crossAxe) {
        var zoom = dollInToFetch(axeReal, axeImaginary);
        var center = centerPath();
        var cameraPosition = { x : center.x, y : center.y, z : center.z };
        cameraPosition[crossAxe] = 1;
        if(crossAxe === "y") {
            cameraPosition.y *= -1;
        }
        lookAtPoint(center, cameraPosition, zoom);
        if(crossAxe === "z" && that.controls.object.position.z < 0) {
            that.controls.rotateUp(Math.PI);
        } else if((crossAxe === "x" && that.controls.object.position.x < 0) ||
                (crossAxe === "y" && that.controls.object.position.y > 0)) {
            that.controls.rotateLeft(Math.PI);
        }
    }

    that.showX = function() {
        showPlane("y", "z", "x");
    };

    that.showY = function() {
        showPlane("x", "z", "y");
    };

    that.showZ = function() {
        showPlane("x", "y", "z");
    };

    //Helpers management:
    that.showAxisHelper = function() {
        that.helpers.addAxisHelper();
        that.refreshDisplay();
    };

    that.hideAxisHelper = function() {
        that.helpers.removeAxisHelper();
        that.refreshDisplay();
    };

    that.showArrows = function() {
        that.helper.addArrows();
        that.refreshDisplay();
    };

    that.hideArrows = function() {
        that.helper.removeArrows();
        that.refreshDisplay();
    };

    that.showHelpers = function() {
        that.helper.addHelpers();
        that.refreshDisplay();
    };

    that.hideHelpers = function() {
        that.helper.removeHelpers();
        that.refreshDisplay();
    };

    that.showBoard = function() {
        if(that.cncConfiguration.board === undefined) {
            return;
        }
        var geometry = new THREE.BoxGeometry(
                that.cncConfiguration.board.width,
                that.cncConfiguration.board.length,
                that.cncConfiguration.board.height
                );

        var material = new THREE.MeshBasicMaterial(0xff0000);
        material.transparent = true;
        material.opacity = 0;
        var object = new THREE.Mesh(geometry, material);
        object.position.x = that.cncConfiguration.board.width / 2;
        object.position.y = that.cncConfiguration.board.length / 2;
        object.position.z = that.cncConfiguration.board.height / 2;
        var box = new THREE.BoxHelper(object);
        that.scene.add(object);
        that.scene.add(box);
        that.boardObject = object;
        that.boardHelper = box;
    };

    that.hideBoard = function() {
        that.scene.remove(that.boardObject);
        that.scene.remove(that.boardBox);
    };

    that.setGCode = function(string) {
        that.gcode = GCodeToGeometry.parse(string);
        if(that.gcode.isComplete === false) {
            displayError(that.gcode.errorMessage);
            return;
        }

        that.path.remove();  //Removing old stuff
        that.path.setMeshes(that.gcode.lines);
        that.refreshDisplay();  //To avoid confusion, we remove everything
    };

    that.hidePaths = function() {
        that.path.remove();
        that.refreshDisplay();
    };

    //Have to set the gcode before
    that.viewPaths = function() {
        that.path.remove();  //Don't know how to check if already in scene
        that.path.add();
        that.totalSize.setMeshes(that.gcode.size, that.inMm);
        that.totalSize.add();
        that.refreshDisplay();
    };

    function changeDisplay(inMm) {
        if(that.gcode.size !== undefined) {
            that.totalSize.setMeshes(that.gcode.size, inMm);
            that.totalSize.add();
        }
        that.refreshDisplay();
    }

    that.displayInMm = function() {
        changeDisplay(true);
    };

    that.displayInInch = function() {
        changeDisplay(false);
    };

    //TODO: delete that
    that.printLines = function(lines) {
        var i = 0;
        var l = {};
        for(i = 0; i < lines.length; i++) {
            l = lines[i];
            console.log("("+l.start.x+"; "+l.start.y+"; "+l.start.z+") => ("+l.end.x+"; "+l.end.y+"; "+l.end.z+")");
        }
    };

    that.createCircle = function(radius, segments) {
        var material = new THREE.LineBasicMaterial({ color: 0xffffff });
        var circleGeometry = new THREE.CircleGeometry(radius, segments);
        that.circleGeometry = circleGeometry;
        return new THREE.Line(circleGeometry , material);
    };

    that.test = function() {
        that.refreshDisplay();
    };

    // initialize
    //Members declaration
    that.renderer = {};
    that.camera = {};
    that.scene = {};
    that.controls = {};
    that.cncConfiguration= {};
    that.gcode = {};

    var width = window.innerWidth, height = window.innerHeight;

    that.inMm = false;
    that.inchToVector = 1; //Convert an inch to the value to put in vectors
    that.callbackError = callbackError;
    that.cncConfiguration = (configuration === undefined) ? {} : configuration;

    if(domElement === undefined || domElement === null) {
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
    setCombinedCamera();
    that.showZ();

    var light = new THREE.PointLight( 0xffffff, 0.8 );
    light.position.set(0, 1, 1);
    that.scene.add( light );

    that.path = new GCodeViewer.Path(that.scene);
    that.totalSize = new GCodeViewer.TotalSize(that.scene);
    that.helpers = new GCodeViewer.Helpers(that.scene);
    that.showBoard();
    that.refreshDisplay();

    //Add the UI
    that.gui = new dat.GUI({ autoPlace : false });
    that.gui.add(that, "inMm").onFinishChange(function() {
        changeDisplay(that.inMm);
    });
    var folderPlanes = that.gui.addFolder("Planes");
    folderPlanes.add(that, "showX");
    folderPlanes.add(that, "showY");
    folderPlanes.add(that, "showZ");
    var folderCamera = that.gui.addFolder("Camera");
    folderCamera.add(that, "setPerspectiveCamera");
    folderCamera.add(that, "setOrthographicCamera");

    //Set the display of the UI in the HTML page
    that.renderer.domElement.parentNode.style.position = "relative";
    that.renderer.domElement.parentNode.appendChild(that.gui.domElement);
    // that.renderer.domElement.style.position = "absolute";
    that.renderer.domElement.style.zIndex = 1;
    that.gui.domElement.style.position = "absolute";
    that.gui.domElement.style.zIndex = 2;
    that.gui.domElement.style.top = "0px";
    that.gui.domElement.style.left = "0px";
};

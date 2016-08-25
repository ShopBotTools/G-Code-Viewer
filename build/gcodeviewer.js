(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("THREE"), require("gcodetogeometry"));
	else if(typeof define === 'function' && define.amd)
		define(["THREE", "gcodetogeometry"], factory);
	else if(typeof exports === 'object')
		exports["GCodeViewer"] = factory(require("THREE"), require("gcodetogeometry"));
	else
		root["GCodeViewer"] = factory(root["THREE"], root["gcodetogeometry"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/*jslint todo: true, browser: true, continue: true, white: true*/

	/**
	 * Written by Alex Canales for ShopBotTools, Inc.
	 */

	var THREE = __webpack_require__(1);
	var gcodetogeometry = __webpack_require__(2);
	var util = __webpack_require__(3);
	var Path = __webpack_require__(4).Path;
	var TotalSize = __webpack_require__(4).TotalSize;
	var Helpers = __webpack_require__(5).Helpers;
	var Gui = __webpack_require__(6).Gui;
	var Animation = __webpack_require__(7).Animation;

	/**
	 * Defines the viewer class. This is the class that the user will instantiate.
	 * This is the main class.
	 *
	 * @class
	 * @param {DomElement} container - The container of the viewer.  Warning: style
	 * of the container: the position must be set as `absolute` or `relative`, else
	 * the position is automatically set to relative (this is needed for the GUI).
	 * @param {number} widthCanvas - The width of the viewer.
	 * @param {number} heightCanvas - The height of the viewer.
	 * @param {function} [callbackError] - The callback function if an error
	 * occurs, should have one parameter: a string which will contain the error
	 * message.
	 * @param {object} [configuration] - The configuration of the machine. If the
	 * board is set, a box representing the board will be displayed, the dimensions
	 * of the board are in inches.
	 * @param {object} [configuration.board] - The dimension of the cut board.
	 * @param {number} configuration.board.width - The width in inches.
	 * @param {number} configuration.board.height - The height in inches.
	 * @param {number} configuration.board.length - The length in inches.
	 * @param {object} [configuration.initialPosition] - The initial position of
	 * the job. If not set, it will be consider as (0; 0; 0).
	 * @param {number} configuration.initialPosition.x - The x position in inches.
	 * @param {number} configuration.initialPosition.y - The y position in inches.
	 * @param {number} configuration.initialPosition.z - The z position in inches.
	 * @param {boolean} [liveMode=false] - The viewer mode. If set true, the viewer
	 * will be in live mode (this mode is explain below), else it is in normal
	 * mode.
	 * @param {boolean} [inInch] - How the unit is displayed. If set true, the unit
	 * will be displayed in inch. If set false, the unit will be displayed in
	 * millimeters. If not set (undefined), the unit will automatically be
	 * displayed according to the G-Code commands.
	 */
	exports.Viewer = function(container, widthCanvas, heightCanvas,
	        callbackError, configuration, liveMode, inInch) {
	    "use strict";
	    var that = this;

	    //Updates the control and the possible animation
	    function animate() {
	        window.requestAnimationFrame(animate);
	        that.controls.update();
	    }

	    //Renders the screen
	    function render() {
	        that.renderer.render(that.scene, that.camera);
	    }

	    /**
	     * Refreshes the screen. To call each time something is change and should be
	     * displayed.
	     *
	     * @function refreshDisplay
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.refreshDisplay = function() {
	        render();
	        animate();
	    };

	    function displayError(message) {
	        if(that.callbackError !== undefined) {
	            that.callbackError(message);
	        }
	    }

	    /**
	     * To call when the canvas or container has resized.
	     *
	     * @param {number} width - The width of the dom element renderer in px.
	     * @param {number} height - The height of the dom element renderer in px.
	     *
	     * @function resize
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.resize = function(width, height) {
	        that.renderer.setSize(width, height);
	        that.camera.setSize(width, height);
	        that.camera.updateProjectionMatrix();
	        that.refreshDisplay();

	        that.gui.resized(width, height);
	    };

	    /**
	     * Changes the type of camera to a perspective camera.
	     *
	     * @function setPerspectiveCamera
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.setPerspectiveCamera = function() {
	        that.camera.toPerspective();
	        that.showZ();
	    };

	    /**
	     * Changes the type of camera to an orthographic camera.
	     *
	     * @function setOrthographicCamera
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.setOrthographicCamera = function() {
	        that.camera.toOrthographic();
	        that.showZ();
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

	    // Returns the center of the path (according to the setting of the initial
	    // position). If there is no path, return (0; 0; 0).
	    function centerPath() {
	        var center = { x : 0, y : 0, z : 0 };

	        //If no GCode given yet
	        if(that.gcode.size === undefined) {
	            return center;
	        }
	        var size = that.gcode.size;
	        center.x = size.min.x + Math.abs(size.max.x - size.min.x) / 2;
	        center.y = size.min.y + Math.abs(size.max.y - size.min.y) / 2;
	        center.z = size.min.z + Math.abs(size.max.z - size.min.z) / 2;

	        if(that.cncConfiguration.initialPosition !== undefined) {
	            center.x += that.cncConfiguration.initialPosition.x;
	            center.y += that.cncConfiguration.initialPosition.y;
	            center.z += that.cncConfiguration.initialPosition.z;
	        }
	        return center;
	    }

	    // Makes the camera look at a point.
	    // camPosition is the new position of the camera (the axe for (un)zoomming
	    //   sould be be equal to 1)
	    // dollyIn is the zoom value
	    function lookAtPoint(point, camPosition, dollyIn) {
	        var pos = that.controls.object.position;
	        that.controls.reset();
	        pos.set(camPosition.x, camPosition.y, camPosition.z);
	        that.controls.target.set(point.x, point.y, point.z);
	        that.controls.dollyIn(dollyIn);
	        that.refreshDisplay();
	    }

	    // Shows the plane, crossAxe (string) is the axe normal to this plan
	    //   (ex: "Z" for XY plan)
	    function showPlane(crossAxe) {
	        var zoom = 1;
	        var center = centerPath();
	        var cameraPosition = { x : center.x, y : center.y, z : center.z };
	        if(crossAxe === "y") {
	            cameraPosition[crossAxe] = center[crossAxe] - 1;
	        } else {
	            cameraPosition[crossAxe] = center[crossAxe] + 1;
	        }

	        //NOTE: using a magic number because a lot of issue trying to
	        // calculate well the dollyIn. Someday, maybe, it will be done correctly
	        if(that.camera.inPerspectiveMode === true) {
	            zoom =  0.25;
	        } else {
	            zoom = 20;
	        }
	        lookAtPoint(center, cameraPosition, zoom);
	    }

	    /**
	     * Shows the plan YZ from the axe X perspective.
	     *
	     * @function showX
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.showX = function() {
	        showPlane("x");
	    };

	    /**
	     * Shows the plan XZ from the axe Y perspective.
	     *
	     * @function showY
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.showY = function() {
	        showPlane("y");
	    };

	    /**
	     * Shows the plan XY from the axe Z perspective.
	     *
	     * @function showZ
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.showZ = function() {
	        showPlane("z");
	    };

	    /**
	     * Shows the ghost of the board (if it was set in the configuration).
	     *
	     * @function showBoard
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
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

	    /**
	     * Hides the ghost of the board.
	     *
	     * @function hideBoard
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.hideBoard = function() {
	        that.scene.remove(that.boardObject);
	        that.scene.remove(that.boardBox);
	    };

	    // Function created because web front end ecosystem is so awesome that we
	    // cannot display an HTML element if the function is not over, during a
	    // loop or whatever other reason
	    function reallySetGCode(string) {
	        var lx = 0, ly = 0, lz = 0;
	        var message = "";
	        that.gcode = gcodetogeometry.parse(string);
	        if(that.gcode.errorList.length > 0) {
	            message = "Be careful, some issues appear in this file.";
	            message += "\nThe machine may not do as displayed here.";
	            displayError(message);
	            that.gui.hideLoadingMessage();
	        }

	        that.path.setMeshes(that.gcode.lines,
	                that.cncConfiguration.initialPosition);
	        that.totalSize.setMeshes(that.gcode.size,
	                that.gcode.displayInInch === false,
	                that.cncConfiguration.initialPosition);

	        that.helpers.resize(that.gcode.size);
	        that.gui.setGCode(that.gcode.gcode);
	        that.gui.hideLoadingMessage();
	        if(liveMode === false) {
	            that.animation.reset();
	        }

	        lx = ((that.gcode.size.max.x - that.gcode.size.min.x) / 2.0 ) || 0.0;
	        ly = ((that.gcode.size.max.y - that.gcode.size.min.y) / 2.0 ) || 0.0;
	        lz = ((that.gcode.size.max.z - that.gcode.size.min.z) / 2.0 ) || 0.0;

	        that.light1.position.set(lx,ly,lz-10);
	        that.light2.position.set(lx,ly,lz+10);

	        that.showZ();
	        that.refreshDisplay();

	        if(inInch === true) {
	            that.displayInInch();
	        } else if(inInch === false) {
	            that.displayInMm();
	        }
	    }

	    /**
	     * Sets the GCode and displays the result.
	     *
	     * @function setGCode
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     * @param {string} The GCode.
	     * @param {function} [callback] Callback function called when the meshes
	     * are created (in case want to do something fancy).
	     */
	    that.setGCode = function(string, callback) {
	        that.gui.displayLoadingMessage();
	        var cb;
	        if(callback === undefined) {
	            cb = function() {
	                reallySetGCode(string);
	            };
	        } else {
	            cb = function() {
	                reallySetGCode(string);
	                callback();
	            };
	        }
	        setTimeout(cb, 100);
	    };

	    // Show the size in inch (if false) or millimeter (if true)
	    function changeDisplay(inMm) {
	        if(that.gcode.size !== undefined) {
	            that.totalSize.setMeshes(that.gcode.size, inMm,
	                that.cncConfiguration.initialPosition);
	        }
	        that.refreshDisplay();
	    }

	    /**
	     * Shows the size in millimiters.
	     *
	     * @function displayInMm
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.displayInMm = function() {
	        changeDisplay(true);
	    };

	    /**
	     * Shows the size in inches.
	     *
	     * @function displayInInch
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     */
	    that.displayInInch = function() {
	        changeDisplay(false);
	    };

	    /**
	     * Sets the currently executed line command.
	     *
	     * @function updateLiveViewer
	     * @memberof GCodeViewer.Viewer
	     * @instance
	     * @param {number} lineNumber - The line number of the command.
	     * @return {boolean} True if the command is displayed.
	     */
	    that.updateLiveViewer = function(lineNumber) {
	        if(
	            liveMode === true &&
	            that.path.highlightCommand(lineNumber) === true
	        ) {
	            that.gui.highlight(lineNumber);
	            that.refreshDisplay();
	            return true;
	        }

	        return false;
	    };

	    // initialize

	    //Members declaration
	    that.renderer = {};
	    that.camera = {};
	    that.scene = {};
	    that.controls = {};
	    that.cncConfiguration = configuration || {};
	    that.gcode = {};

	    that.callbackError = callbackError;

	    if(util.webGLEnabled() === false) {
	        displayError("WebGL is not enable. Impossible to preview.");
	        return;
	    }

	    if(container === undefined || container === null) {
	        displayError("No container set.");
	        return;
	    }

	    if(liveMode === undefined) {
	        liveMode = false;
	    }

	    if(liveMode === true) {
	        console.log("Live mode");
	    } else {
	        console.log("Viewer mode");
	    }

	    that.renderer = new THREE.WebGLRenderer({antialias: true});
	    that.renderer.setSize(widthCanvas, heightCanvas);
	    that.renderer.domElement.style.zIndex = 1;
	    container.appendChild(that.renderer.domElement);

	    that.renderer.setClearColor( 0xebebeb );
	    that.renderer.setPixelRatio( window.devicePixelRatio );

	    that.scene = new THREE.Scene();
	    setCombinedCamera();
	    that.showZ();

	    that.light1 = new THREE.PointLight( 0xffffff, 1, 100 );
	    that.light1.position.set( 0, 0, -10 );
	    that.scene.add( that.light1 );

	    that.light2 = new THREE.PointLight( 0xffffff, 1, 100 );
	    that.light2.position.set( 0, 0, 10 );
	    that.scene.add( that.light2 );

	    that.path = new Path(that.scene);
	    that.totalSize = new TotalSize(that.scene);
	    that.helpers = new Helpers(that.scene);
	    that.showBoard();
	    that.refreshDisplay();

	    //Add the UI
	    var callbacks = {
	        showX : that.showX,
	        showY : that.showY,
	        showZ : that.showZ,
	        displayInMm : that.displayInMm ,
	        displayInIn : that.displayInInch ,
	        perspective : that.setPerspectiveCamera,
	        orthographic : that.setOrthographicCamera,
	        resume : function() { that.animation.resume(); },
	        pause : function() { that.animation.pause(); },
	        reset : function() { that.animation.reset(); },
	        goToLine : function(lineNumber) { that.animation.goToLine(lineNumber); }

	    };
	    that.gui = new Gui(that.renderer, widthCanvas, heightCanvas,
	            that.cncConfiguration, callbacks, liveMode);

	    //Add animation
	    if(liveMode === false) {
	        that.animation = new Animation(that.scene,
	                that.refreshDisplay, that.gui, that.path, 24,
	                that.cncConfiguration.initialPosition);
	    }
	};


/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_2__;

/***/ },
/* 3 */
/***/ function(module, exports) {

	/*jslint todo: true, browser: true, continue: true, white: true*/

	/**
	 * Written by Alex Canales for ShopBotTools, Inc.
	 */

	/**
	 * Checks if WebGL is enabled or not.
	 * @return {boolean} True is enabled
	 */
	exports.webGLEnabled = function() {
	    // From http://www.browserleaks.com/webgl#howto-detect-webgl
	    if(!!window.WebGLRenderingContext) {
	        var canvas = document.createElement("canvas");
	        var names = ["webgl", "experimental-webgl", "moz-webgl"];
	        var gl = false;
	        var i = 0;
	        for(i = 0; i < names.length; i++) {
	            try {
	                gl = canvas.getContext(names[i]);
	                if (gl && typeof gl.getParameter === "function") {
	                    /* WebGL is enabled */
	                    return true;
	                }
	            } catch(ignore) {}
	        }
	        /* WebGL is supported, but disabled */
	        return false;
	    }
	    /* WebGL not supported*/
	    return false;
	};

	/**
	 * Checks if two points in 3D are equal.
	 *
	 * @param {object} a Point A.
	 * @param {object} b Point B.
	 * @return {boolean} True if the two points are equal.
	 */
	exports.pointsEqual = function(a, b) {
	    return (a.x === b.x && a.y === b.y && a.z === b.z);
	};

	/**
	 * Returns a copy of a point in 3D.
	 *
	 * @param {object} point A point in 3D.
	 * @return {object} A copy of the point.
	 */
	exports.copyPoint = function(point) {
	    return { x : point.x, y : point.y, z : point.z };
	};

	function nearlyEqual(a, b) {
	    return Math.abs(b - a) <= 0.001;
	}
	exports.nearlyEqual = nearlyEqual;

	/**
	 * Checks if two points in 3D are considered as "equal". This function is
	 * useful to avoid to be too much precise (JavaScript can not do very precise
	 * calculations).
	 *
	 * @param {object} a Point A.
	 * @param {object} b Point B.
	 * @return {boolean} True if the two points are nearly equal.
	 */
	exports.samePosition = function(posA, posB) {
	    return (nearlyEqual(posA.x, posB.x) &&
	            nearlyEqual(posA.y, posB.y) &&
	            nearlyEqual(posA.z, posB.z));
	};


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/*jslint todo: true, browser: true, continue: true, white: true*/

	/**
	 * Written by Alex Canales for ShopBotTools, Inc.
	 */

	/**
	 * This file contains the class managing the path view.
	 */

	var THREE = __webpack_require__(1);
	var util = __webpack_require__(3);

	//Class to create the meshes showing the measure of the path
	exports.TotalSize = function(scene) {
	    "use strict";
	    var that = this;

	    /**
	     * Removes the meshes from the scene.
	     */
	    that.remove = function() {
	        that.scene.remove(that.textWidth);
	        that.scene.remove(that.lineWidth);
	        that.scene.remove(that.textLength);
	        that.scene.remove(that.lineLength);
	        that.scene.remove(that.textHeight);
	        that.scene.remove(that.lineHeight);
	    };

	    /**
	     * Adds the meshes to the scene.
	     */
	    that.add = function() {
	        that.scene.add(that.textWidth);
	        that.scene.add(that.lineWidth);
	        that.scene.add(that.textLength);
	        that.scene.add(that.lineLength);
	        that.scene.add(that.textHeight);
	        that.scene.add(that.lineHeight);
	    };

	    function createMeshText(message, options, color) {
	        var material = new THREE.MeshBasicMaterial({ color: color,
	            side: THREE.DoubleSide });
	        var textShapes = THREE.FontUtils.generateShapes(message, options);
	        var geo = new THREE.ShapeGeometry(textShapes);
	        return new THREE.Mesh(geo, material);
	    }

	    function sizeMesh(mesh, axe) {
	        var bb = {};
	        mesh.geometry.computeBoundingBox();
	        bb = mesh.geometry.boundingBox;
	        return Math.abs(bb.max[axe] - bb.min[axe]);
	    }

	    function calculateFontSize(width, length, height) {
	        var minSize = 0.25, maxSize = 3, coeff = 20;
	        var biggest = Math.max(width, length, height);
	        var size = minSize;

	        size = Math.max(minSize, biggest / coeff);
	        size = Math.min(maxSize, size);

	        return size;
	    }

	    /**
	     * Sets the meshes.
	     *
	     * @param {object} totalSize The total size of the whole path.
	     * @param {boolean} displayInMm If true, shows the size in millimeter. Else
	     * in inch.
	     * @param {object} initialPosition The position, in 3D, where thr whole
	     * path begins (optional).
	     */
	    that.setMeshes = function(totalSize, displayInMm, initialPosition) {
	        var INCH_TO_MILLIMETER = 25.4;
	        if(totalSize === undefined) {
	            return;
	        }
	        var color = 0x000000;
	        var margin = 0.5;
	        var material = new THREE.LineBasicMaterial({ color : color });
	        var geometry = new THREE.Geometry();
	        var type = (displayInMm === false) ? "in" : "mm";
	        var d = (displayInMm === false) ? 1 : INCH_TO_MILLIMETER;
	        var width = Math.abs(totalSize.max.x - totalSize.min.x);
	        var length = Math.abs(totalSize.max.y - totalSize.min.y);
	        var height = Math.abs(totalSize.max.z - totalSize.min.z);
	        var textW = (width * d).toFixed(2);
	        var textL = (length * d).toFixed(2);
	        var textH = (height * d).toFixed(2);
	        var fontSize = calculateFontSize(width, length, height);
	        var options = {'font' : 'helvetiker','weight' : 'normal',
	            'style' : 'normal','size' : fontSize,'curveSegments' : 300};

	        that.remove();

	        // For x axe
	        var y = totalSize.max.y + margin;
	        geometry.vertices.push(new THREE.Vector3(totalSize.min.x, y , 0));
	        geometry.vertices.push(new THREE.Vector3(totalSize.max.x, y , 0));
	        that.lineWidth =  new THREE.Line(geometry, material);
	        that.textWidth = createMeshText(textW + " " + type, options, color);
	        that.textWidth.position.x = that.lineWidth.geometry.vertices[0].x +
	            (width - sizeMesh(that.textWidth, "x")) / 2;
	        that.textWidth.position.y = that.lineWidth.geometry.vertices[0].y +
	            options.size;
	        that.textWidth.position.z = that.lineWidth.geometry.vertices[0].z;

	        // For y axe
	        var x = totalSize.max.x + margin;
	        geometry = new THREE.Geometry();
	        geometry.vertices.push(new THREE.Vector3(x, totalSize.min.y, 0));
	        geometry.vertices.push(new THREE.Vector3(x, totalSize.max.y, 0));
	        that.lineLength =  new THREE.Line(geometry, material);
	        that.textLength = createMeshText(textL + " " + type, options, color);
	        that.textLength.rotateZ(-Math.PI/2);
	        that.textLength.position.x = that.lineLength.geometry.vertices[0].x +
	            options.size;
	        that.textLength.position.y = that.lineLength.geometry.vertices[0].y +
	            (length + sizeMesh(that.textLength, "x")) / 2;  //x 'cause rotation
	        that.textLength.position.z = that.lineLength.geometry.vertices[0].z;

	        // For z axe
	        geometry = new THREE.Geometry();
	        geometry.vertices.push(new THREE.Vector3(x, y, totalSize.min.z));
	        geometry.vertices.push(new THREE.Vector3(x, y, totalSize.max.z));
	        that.lineHeight =  new THREE.Line(geometry, material);
	        that.textHeight = createMeshText(textH + " " + type, options, color);
	        that.textHeight.rotateX(Math.PI / 2);
	        that.textHeight.position.x = that.lineHeight.geometry.vertices[0].x +
	            options.size;
	        that.textHeight.position.y = that.lineHeight.geometry.vertices[0].y;
	        that.textHeight.position.z = that.lineHeight.geometry.vertices[0].z +
	            (height - sizeMesh(that.textHeight, "y")) / 2;  //y 'cause rotation

	        if(initialPosition !== undefined) {
	            that.lineWidth.position.x += initialPosition.x;
	            that.textWidth.position.x += initialPosition.x;
	            that.lineLength.position.y += initialPosition.y;
	            that.textLength.position.y += initialPosition.y;
	            that.textHeight.position.z += initialPosition.z;
	            that.lineHeight.position.z += initialPosition.z;
	        }

	        that.add();
	    };

	    // initialize
	    that.scene = scene;
	    that.textWidth = {};
	    that.lineWidth = {};
	    that.textLength = {};
	    that.lineLength = {};
	    that.textHeight = {};
	    that.lineHeight = {};
	};


	exports.Path = function(scene) {
	    "use strict";
	    var that = this;

	    function resetPathsMesh() {
	        that.remove();
	        that.meshG0Undone = {};
	        that.meshG1Undone = {};
	        that.meshG2G3Undone = {};
	        that.meshG0Done = {};
	        that.meshG1Done = {};
	        that.meshG2G3Done = {};
	        that.meshDoing = {};
	    }

	    /**
	     * Removes the meshes from the scene.
	     */
	    that.remove = function() {
	        that.scene.remove(that.meshG0Undone);
	        that.scene.remove(that.meshG1Undone);
	        that.scene.remove(that.meshG2G3Undone);
	        that.scene.remove(that.meshG0Done);
	        that.scene.remove(that.meshG1Done);
	        that.scene.remove(that.meshG2G3Done);
	        that.scene.remove(that.meshDoing);
	    };

	    /**
	     * Adds the meshes to the scene.
	     */
	    that.add = function() {
	        that.scene.add(that.meshG0Undone);
	        that.scene.add(that.meshG1Undone);
	        that.scene.add(that.meshG2G3Undone);
	        that.scene.add(that.meshG0Done);
	        that.scene.add(that.meshG1Done);
	        that.scene.add(that.meshG2G3Done);
	    };

	    function getGeometryStraight(line) {
	        var s = line.start, e = line.end;
	        var geometry = new THREE.Geometry();
	        geometry.vertices.push(new THREE.Vector3(s.x, s.y, s.z));
	        geometry.vertices.push(new THREE.Vector3(e.x, e.y, e.z));
	        return geometry;
	    }

	    function getGeometryCurve(line) {
	        var i = 0, j = 0;
	        var bez = line.beziers;
	        var p0 = {}, p1 = {}, p2 = {}, p3 = {};
	        var v = [];
	        var geometry = new THREE.Geometry();

	        for(i=0; i < bez.length; i++) {
	            p0 = new THREE.Vector3(bez[i].p0.x, bez[i].p0.y, bez[i].p0.z);
	            p1 = new THREE.Vector3(bez[i].p1.x, bez[i].p1.y, bez[i].p1.z);
	            p2 = new THREE.Vector3(bez[i].p2.x, bez[i].p2.y, bez[i].p2.z);
	            p3 = new THREE.Vector3(bez[i].p3.x, bez[i].p3.y, bez[i].p3.z);

	            v = new THREE.CubicBezierCurve3(p0, p1, p2, p3).getPoints(32);
	            for(j=0; j < v.length-1; j++) {
	                geometry.vertices.push(v[j]);
	            }
	        }
	        //When mutltiple Bézier curves, useless to have the end point and the
	        //next start point in the same place
	        geometry.vertices.push(v[v.length-1]);
	        return geometry;
	    }

	     // Returns the geometries
	    function setGeometries(lines) {
	        var i = 0, j = 0;
	        var geometry = new THREE.Geometry();
	        var geometries = {
	            G0 : new THREE.Geometry(),
	            G1 : new THREE.Geometry(),
	            G2G3 : new THREE.Geometry()
	        };

	        //Store the number of vertices of each command
	        that.commandsUndoneManager = [];
	        that.commandsDoneManager = [];

	        if(lines.length === 0) {
	            return geometries;
	        }

	        for(i=0; i < lines.length; i++) {
	            if(lines[i].type === "G0") {
	                geometry = getGeometryStraight(lines[i]);
	                geometries.G0.merge(geometry);

	                that.commandsUndoneManager.push({
	                    type : lines[i].type,
	                    lineNumber : lines[i].lineNumber,
	                    feedrate : lines[i].feedrate,
	                    start : util.copyPoint(geometry.vertices[0]),
	                    end : util.copyPoint(geometry.vertices[geometry.vertices.length - 1]),
	                    numberVertices : geometry.vertices.length
	                });
	            } else if(lines[i].type === "G1") {
	                geometry = getGeometryStraight(lines[i]);
	                geometries.G1.merge(geometry);

	                that.commandsUndoneManager.push({
	                    type : lines[i].type,
	                    lineNumber : lines[i].lineNumber,
	                    feedrate : lines[i].feedrate,
	                    start : util.copyPoint(geometry.vertices[0]),
	                    end : util.copyPoint(geometry.vertices[geometry.vertices.length - 1]),
	                    numberVertices : geometry.vertices.length
	                });
	            } else if(lines[i].type === "G2" || lines[i].type === "G3") {
	                geometry = getGeometryCurve(lines[i]);
	                geometries.G2G3.vertices.push(geometry.vertices[0]);

	                for(j=1; j < geometry.vertices.length-1; j++) {
	                    geometries.G2G3.vertices.push(geometry.vertices[j]);
	                    geometries.G2G3.vertices.push(geometry.vertices[j]);
	                }
	                geometries.G2G3.vertices.push(geometry.vertices[j]);

	                that.commandsUndoneManager.push({
	                    type : lines[i].type,
	                    lineNumber : lines[i].lineNumber,
	                    feedrate : lines[i].feedrate,
	                    start : util.copyPoint(geometry.vertices[0]),
	                    end : util.copyPoint(geometry.vertices[geometry.vertices.length - 1]),
	                    numberVertices : (geometry.vertices.length - 1) * 2
	                });
	            }
	        }

	        return geometries;
	    }

	    /**
	     * Sets the meshes (and remove the old ones).
	     *
	     * @param {array} lines The array of lines describing the whole path.
	     * @param {object} initialPosition The position, in 3D, where thr whole
	     * path begins (optional).
	     */
	    that.setMeshes = function(lines, initialPosition) {
	        resetPathsMesh();
	        var geometries = setGeometries(lines);
	        that.lines = lines;
	        that.initialPosition = { x : 0, y : 0, z : 0};

	        that.meshG0Undone = new THREE.Line(geometries.G0,
	                that.matG0Undone, THREE.LinePieces);
	        that.meshG1Undone = new THREE.Line(geometries.G1,
	                that.matG1Undone, THREE.LinePieces);
	        that.meshG2G3Undone = new THREE.Line(geometries.G2G3,
	                that.matG2G3Undone, THREE.LinePieces);
	        that.meshG0Done = new THREE.Line(new THREE.Geometry(),
	                that.matG0Done, THREE.LinePieces);
	        that.meshG1Done = new THREE.Line(new THREE.Geometry(),
	                that.matG1Done, THREE.LinePieces);
	        that.meshG2G3Done = new THREE.Line(new THREE.Geometry(),
	                that.matG2G3Done, THREE.LinePieces);

	        that.meshDoing = new THREE.Line(new THREE.Geometry(),
	                that.matDoing, THREE.LinePieces);

	        if(initialPosition !== undefined) {
	            that.initialPosition.x = initialPosition.x;
	            that.initialPosition.y = initialPosition.y;
	            that.initialPosition.z = initialPosition.z;
	            that.meshG0Undone.position.set(initialPosition.x,
	                    initialPosition.y, initialPosition.z);
	            that.meshG1Undone.position.set(initialPosition.x,
	                    initialPosition.y, initialPosition.z);
	            that.meshG2G3Undone.position.set(initialPosition.x,
	                    initialPosition.y, initialPosition.z);
	            that.meshG0Done.position.set(initialPosition.x,
	                    initialPosition.y, initialPosition.z);
	            that.meshG1Done.position.set(initialPosition.x,
	                    initialPosition.y, initialPosition.z);
	            that.meshG2G3Done.position.set(initialPosition.x,
	                    initialPosition.y, initialPosition.z);
	        }
	        that.add();
	    };

	    /**
	     * Redoes the meshes as it was
	     */
	    that.redoMeshes = function() {
	        if(that.meshG0Done.geometry.vertices.length > 0 ||
	                that.meshG1Done.geometry.vertices.length > 0 ||
	                that.meshG2G3Done.geometry.vertices.length > 0)
	        {
	            that.remove();
	            that.setMeshes(that.lines, that.initialPosition);
	            that.add();
	        }
	    };

	    /**
	     * Returns the path the animation has to follow.
	     *
	     * @return {array} The path the animation has to follow.
	     */
	    that.getPath = function() {
	        var iG0 = 0, iG1 = 0, iG2G3 = 0;
	        var iCommand = 0, iCurrent = 0, iEnd = 0;
	        var command = {};
	        var path = [], vertices = [];

	        if(that.lines === undefined) {
	            return [];
	        }

	        for(iCommand=0; iCommand < that.commandsUndoneManager.length; iCommand++) {
	            command = that.commandsUndoneManager[iCommand];
	            if(command.type === "G0") {
	                iCurrent = iG0;
	                vertices = that.meshG0Undone.geometry.vertices;
	            } else if(command.type === "G1") {
	                iCurrent = iG1;
	                vertices = that.meshG1Undone.geometry.vertices;
	            } else {
	                iCurrent = iG2G3;
	                vertices = that.meshG2G3Undone.geometry.vertices;
	            }
	            iEnd = iCurrent + command.numberVertices - 1;

	            path.push({
	                point : util.copyPoint(vertices[iCurrent]),
	                type : command.type,
	                lineNumber : command.lineNumber,
	                commandNumber : iCommand,
	                feedrate : command.feedrate
	            });
	            iCurrent++;
	            while(iCurrent < iEnd) {
	                path.push({
	                    point : util.copyPoint(vertices[iCurrent]),
	                    type : command.type,
	                    lineNumber : command.lineNumber,
	                    commandNumber : iCommand,
	                    feedrate : command.feedrate
	                });
	                iCurrent += 2;
	            }
	            path.push({
	                point : util.copyPoint(vertices[iCurrent]),
	                type : command.type,
	                lineNumber : command.lineNumber,
	                commandNumber : iCommand,
	                feedrate : command.feedrate
	            });
	            iCurrent++;

	            if(command.type === "G0") {
	               iG0 = iCurrent;
	            } else if(command.type === "G1") {
	               iG1 = iCurrent;
	            } else {
	               iG2G3 = iCurrent;
	            }
	        }

	        return path;
	    };

	    //This is ridiculous not to manage to update the vertices
	    //Change the selectionned mesh
	    function changeMesh(vertices, type, done) {
	        var mat = {}, pos = {};
	        var geo = new THREE.Geometry();
	        geo.vertices = vertices;

	        if(done === true) {
	            if(type === "G0") {
	                mat = that.matG0Done;
	                pos = that.meshG0Done.position.clone();
	                that.scene.remove(that.meshG0Done);
	                that.meshG0Done = new THREE.Line(geo, mat, THREE.LinePieces);
	                that.meshG0Done.position.set(pos.x, pos.y, pos.z);
	                that.scene.add(that.meshG0Done);
	            } else if(type === "G1") {
	                mat = that.matG1Done;
	                pos = that.meshG1Done.position.clone();
	                that.scene.remove(that.meshG1Done);
	                that.meshG1Done = new THREE.Line(geo, mat, THREE.LinePieces);
	                that.meshG1Done.position.set(pos.x, pos.y, pos.z);
	                that.scene.add(that.meshG1Done);
	            } else {
	                mat = that.matG2G3Done;
	                pos = that.meshG2G3Done.position.clone();
	                that.scene.remove(that.meshG2G3Done);
	                that.meshG2G3Done = new THREE.Line(geo, mat, THREE.LinePieces);
	                that.meshG2G3Done.position.set(pos.x, pos.y, pos.z);
	                that.scene.add(that.meshG2G3Done);
	            }
	        } else {
	            if(type === "G0") {
	                mat = that.matG0Undone;
	                pos = that.meshG0Undone.position.clone();
	                that.scene.remove(that.meshG0Undone);
	                that.meshG0Undone = new THREE.Line(geo, mat, THREE.LinePieces);
	                that.meshG0Undone.position.set(pos.x, pos.y, pos.z);
	                that.scene.add(that.meshG0Undone);
	            } else if(type === "G1") {
	                mat = that.matG1Undone;
	                pos = that.meshG1Undone.position.clone();
	                that.scene.remove(that.meshG1Undone);
	                that.meshG1Undone = new THREE.Line(geo, mat, THREE.LinePieces);
	                that.meshG1Undone.position.set(pos.x, pos.y, pos.z);
	                that.scene.add(that.meshG1Undone);
	            } else {
	                mat = that.matG2G3Undone;
	                pos = that.meshG2G3Undone.position.clone();
	                that.scene.remove(that.meshG2G3Undone);
	                that.meshG2G3Undone = new THREE.Line(geo, mat, THREE.LinePieces);
	                that.meshG2G3Undone.position.set(pos.x, pos.y, pos.z);
	                that.scene.add(that.meshG2G3Undone);
	            }
	        }
	    }

	    //Return an object containing the "undone" and the "done" meshes
	    function getMeshes(type) {
	        var res = { undone : {}, done : {} };

	        if(type === "G0") {
	            res.undone = that.meshG0Undone;
	            res.done = that.meshG0Done;
	        } else if(type === "G1") {
	            res.undone = that.meshG1Undone;
	            res.done = that.meshG1Done;
	        } else {  //I assume the types are correct
	            res.undone = that.meshG2G3Undone;
	            res.done = that.meshG2G3Done;
	        }

	        return res;
	    }

	    /**
	     * To call when the bit starts a new path.
	     *
	     * @param {object} pointPath The point path the bit is reaching (this point
	     * is from the path returned by getPath).
	     */
	    that.startPath = function(pointPath) {
	        var meshes = getMeshes(pointPath.type);
	        var meshDone = meshes.done;
	        var verticesDone = meshDone.geometry.vertices;
	        var p = pointPath.point;

	        verticesDone.push(new THREE.Vector3(p.x, p.y, p.z));
	        verticesDone.push(new THREE.Vector3(p.x, p.y, p.z));
	        //No need to change vertices of the meshUndone

	        changeMesh(verticesDone, pointPath.type, true);

	        that.commandsDoneManager.push({
	            type : that.commandsUndoneManager[0].type,
	            lineNumber : that.commandsUndoneManager[0].lineNumber,
	            feedrate : that.commandsUndoneManager[0].feedrate,
	            start : util.copyPoint(that.commandsUndoneManager[0].start),
	            end : util.copyPoint(that.commandsUndoneManager[0].end),
	            numberVertices : 2
	        });
	    };

	    /**
	     * To call when the bit ends a path.
	     *
	     * @param {object} pointPath The point path the bit is reaching (this point
	     * is from the path returned by getPath).
	     */
	    that.endPath = function(pointPath) {
	        var meshes = getMeshes(pointPath.type);
	        var meshDone = meshes.done, meshUndone = meshes.undone;
	        var verticesDone = meshDone.geometry.vertices;
	        var verticesUndone = meshUndone.geometry.vertices;
	        var p = pointPath.point;

	        if(verticesDone.length === 0) {
	            return false;
	        }
	        verticesDone[verticesDone.length -1] = new THREE.Vector3(p.x, p.y, p.z);

	        //Remove the vertex following the bit and the one at the end of the path
	        verticesUndone.splice(0, 2);

	        changeMesh(verticesDone, pointPath.type, true);
	        changeMesh(verticesUndone, pointPath.type, false);

	        if(that.commandsUndoneManager[0].numberVertices > 2) {
	            that.commandsUndoneManager[0].numberVertices -= 2;
	        } else {
	            that.commandsUndoneManager.splice(0, 1);
	        }
	    };

	    /**
	     * To call when the bit reaches an intermediate point of a path.
	     *
	     * @param {object} pointPath The point path the bit is reaching (this point
	     * is from the path returned by getPath).
	     */
	    that.reachedIntermediate = function(pointPath) {
	        that.endPath(pointPath);
	        that.startPath(pointPath);
	    };

	    /**
	     * To call when the bit from the animation is reaching one point from the
	     * path.
	     *
	     * @param {object} pointPath The point path the bit is reaching (this point
	     * is from the path returned by getPath).
	     * @param {object} currentPosition The current position of the bit in 3D.
	     * @return {boolean} False if there was a problem.
	     */
	    that.isReachingPoint = function(pointPath, currentPosition) {
	        var meshes = getMeshes(pointPath.type);
	        var meshDone = meshes.done, meshUndone = meshes.undone;
	        var verticesDone = meshDone.geometry.vertices;
	        var verticesUndone = meshUndone.geometry.vertices;
	        var p = currentPosition;

	        if(verticesDone.length < 2) {
	            return false;
	        }
	        verticesUndone[0].set(p.x, p.y, p.z);
	        verticesDone[verticesDone.length -1].set(p.x, p.y, p.z);
	        changeMesh(verticesDone, pointPath.type, true);
	        changeMesh(verticesUndone, pointPath.type, false);

	        return true;
	    };

	    // //Returns false if error else returns true
	    // that.goToLine = function(lineNumber) {
	    //     //NOTE: commandsUndoneManager and commandsDoneManager were creating
	    //     //to ease and improve the way to generate meshes when the users wants
	    //     //to go directly to a specific line.
	    //     //To sum up the algorithm:
	    //     //* find if need to increment or decrement
	    //     //* extract for the undone (increment) or done (decrement) vertices
	    //     //  according to numberVertices and push them to the other one mesh
	    //     //* update commandsUndoneManager and commandsDoneManager
	    // };

	    /**
	     * Highlights the currently executed line command.
	     *
	     * @param {number} The line number of the command.
	     * @return {boolean} True if the command is displayed.
	     */
	    that.highlightCommand = function(lineNumber) {
	        var i = 0;
	        var meshes;
	        var geometry, position;
	        var addingGeometry, removingGeometry, numberVertices, vertices;

	        if(lineNumber === that.currentLineNumber) {
	            return true;
	        }

	        //Checking if the commands in this line are possibly displayed
	        if(that.commandsUndoneManager.length === 0) {
	            return false;
	        }
	        while(that.commandsUndoneManager[i].lineNumber !== lineNumber) {
	            if(that.commandsUndoneManager[i].lineNumber > lineNumber) {
	                return false;
	            }
	            if(i === that.commandsUndoneManager.length - 1) {
	                return false;
	            }
	            i++;
	        }
	        that.currentLineNumber = lineNumber;

	        //NOTE: At this point, that.commandsUndoneManager[0] corresponds to the
	        //doing mesh

	        //Put in done meshes the vertices of the doing mesh
	        while(that.meshDoing.geometry.vertices.length > 0) {
	            meshes = getMeshes(that.commandsUndoneManager[0].type);
	            addingGeometry = meshes.done.geometry;
	            removingGeometry = that.meshDoing.geometry;
	            numberVertices = that.commandsUndoneManager[0].numberVertices;

	            vertices = removingGeometry.vertices.splice(0, numberVertices);
	            addingGeometry.vertices = addingGeometry.vertices.concat(vertices);
	        }

	        //Put from undone to done all the commands that are passed
	        while(that.commandsUndoneManager[0] !== undefined &&
	                that.commandsUndoneManager[0].lineNumber !== lineNumber) {
	            meshes = getMeshes(that.commandsUndoneManager[0].type);
	            addingGeometry = meshes.done.geometry;
	            removingGeometry = meshes.undone.geometry;
	            numberVertices = that.commandsUndoneManager[0].numberVertices;

	            vertices = removingGeometry.vertices.splice(0, numberVertices);
	            addingGeometry.vertices = addingGeometry.vertices.concat(vertices);

	            that.commandsUndoneManager.splice(0, 1);
	        }

	        //Put the vertices in the doing of the currently executed commands and
	        //remove the vertices in the undone meshes
	        while(that.commandsUndoneManager[0] !== undefined &&
	                that.commandsUndoneManager[0].lineNumber === lineNumber) {
	            meshes = getMeshes(that.commandsUndoneManager[0].type);
	            addingGeometry = that.meshDoing.geometry;
	            removingGeometry = meshes.undone.geometry;
	            numberVertices = that.commandsUndoneManager[0].numberVertices;

	            vertices = removingGeometry.vertices.splice(0, numberVertices);
	            addingGeometry.vertices = addingGeometry.vertices.concat(vertices);

	            that.commandsUndoneManager.splice(0, 1);
	        }

	        //Updating meshes
	        changeMesh(that.meshG0Undone.geometry.vertices, "G0", false);
	        changeMesh(that.meshG1Undone.geometry.vertices, "G1", false);
	        changeMesh(that.meshG2G3Undone.geometry.vertices, "G2G3", false);
	        changeMesh(that.meshG0Done.geometry.vertices, "G0", true);
	        changeMesh(that.meshG1Done.geometry.vertices, "G1", true);
	        changeMesh(that.meshG2G3Done.geometry.vertices, "G2G3", true);

	        that.scene.remove(that.meshDoing);
	        geometry = new THREE.Geometry();
	        geometry.vertices = that.meshDoing.geometry.vertices;
	        position = that.meshDoing.position.clone();
	        that.meshDoing = new THREE.Line(geometry, that.matDoing, THREE.LinePieces);
	        that.meshDoing.position.set(position.x, position.y, position.z);
	        that.scene.add(that.meshDoing);

	        return true;
	    };

	    // initialize
	    that.scene = scene;
	    that.commandsUndoneManager = [];
	    that.commandsDoneManager = [];

	    that.currentLineNumber = -1;

	    resetPathsMesh();
	    that.matG0Undone = new THREE.LineBasicMaterial({ color : 0xff0000 });
	    that.matG1Undone = new THREE.LineBasicMaterial({ color : 0x000ff });
	    that.matG2G3Undone = new THREE.LineBasicMaterial({ color : 0x000ff });
	    that.matG0Done = new THREE.LineBasicMaterial({ color : 0xff00ff });
	    that.matG1Done = new THREE.LineBasicMaterial({color : 0xff00ff });
	    that.matG2G3Done = new THREE.LineBasicMaterial({ color : 0xff00ff });

	    that.matDoing = new THREE.LineBasicMaterial({
	        color : 0x00ffff, linewidth : 7
	    });
	};


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/*jslint todo: true, browser: true, continue: true, white: true*/

	/**
	 * Written by Alex Canales for ShopBotTools, Inc.
	 */

	/**
	 * This file contains the class managing the UI helpers (arrows, axis, etc).
	 */

	var THREE = __webpack_require__(1);

	var Helpers = function(scene) {
	    "use strict";
	    var that = this;

	    //Arrows helpers
	    that.addArrows = function() {
	        that.scene.add(that.arrowX);
	        that.scene.add(that.textX);
	        that.scene.add(that.arrowY);
	        that.scene.add(that.textY);
	        that.scene.add(that.arrowZ);
	        that.scene.add(that.textZ);
	        that.scene.add(that.textZ2);
	    };

	    that.removeArrows = function() {
	        that.scene.remove(that.arrowX);
	        that.scene.remove(that.textX);
	        that.scene.remove(that.arrowY);
	        that.scene.remove(that.textY);
	        that.scene.remove(that.arrowZ);
	        that.scene.remove(that.textZ);
	        that.scene.remove(that.textZ2);
	    };

	    //size is a struct { length, head, font }
	    function createArrowsHelper(headSize) {
	        var length = 3, fontSize = headSize * 2;
	        var options = {'font' : 'helvetiker','weight' : 'normal',
	            'style' : 'normal','size' : fontSize,'curveSegments' : 300};
	        var margin = headSize + headSize / 2;

	        //For X
	        var dir = new THREE.Vector3(1, 0, 0);
	        var origin = new THREE.Vector3(0, -margin, 0);
	        var hex = 0xff0000;
	        that.arrowX = new THREE.ArrowHelper(dir, origin, length, hex,
	                headSize, headSize);

	        var material = new THREE.MeshBasicMaterial({ color: hex,
	            side: THREE.DoubleSide });
	        var textShapes = THREE.FontUtils.generateShapes("X", options);
	        var geo = new THREE.ShapeGeometry(textShapes);
	        that.textX = new THREE.Mesh(geo, material);
	        that.textX.position.x = origin.x + length + margin;
	        that.textX.position.y = origin.y - options.size/2;
	        that.textX.position.z = origin.z;

	        //For Y
	        dir = new THREE.Vector3(0, 1, 0);
	        origin = new THREE.Vector3(-margin, 0, 0);
	        hex = 0x00ff00;
	        that.arrowY = new THREE.ArrowHelper(dir, origin, length, hex,
	                headSize, headSize);

	        material = new THREE.MeshBasicMaterial({ color: hex,
	            side: THREE.DoubleSide });
	        textShapes = THREE.FontUtils.generateShapes("Y", options);
	        geo = new THREE.ShapeGeometry(textShapes);
	        that.textY = new THREE.Mesh(geo, material);
	        that.textY.position.x = origin.x - options.size/2;
	        that.textY.position.y = origin.y + length + margin;
	        that.textY.position.z = origin.z;

	        //For Z
	        dir = new THREE.Vector3(0, 0, 1);
	        origin = new THREE.Vector3(-margin, -margin, 0);
	        hex = 0x0000ff;
	        that.arrowZ = new THREE.ArrowHelper(dir, origin, length, hex,
	                headSize, headSize);

	        material = new THREE.MeshBasicMaterial({ color: hex });
	        textShapes = THREE.FontUtils.generateShapes("Z", options);
	        geo = new THREE.ShapeGeometry(textShapes);
	        that.textZ = new THREE.Mesh(geo, material);
	        that.textZ.position.x = origin.x - options.size/2;
	        that.textZ.position.y = origin.y;
	        that.textZ.position.z = origin.z + length + margin;
	        that.textZ.rotateX(Math.PI / 2);

	        //To not see the Z "upside down" change rotating
	        that.textZ2 = that.textZ.clone();
	        that.textZ2.rotateX(Math.PI);
	        that.textZ2.position.z += options.size;
	    }

	    //Redo the meshes to suit with the size
	    that.resize = function(totalSize) {
	        var xSize = 0, ySize = 0;
	        var minSize = 0.25, maxSize = 3, coeff = 40;
	        var size = minSize;
	        that.removeArrows();

	        if(totalSize !== undefined) {
	            xSize = totalSize.max.x - totalSize.min.x;
	            ySize = totalSize.max.y - totalSize.min.y;
	            size = Math.max(minSize, Math.max(xSize, ySize) / coeff);
	            size = Math.min(maxSize, size);
	        }

	        createArrowsHelper(size);
	        that.addArrows();
	    };

	    // initialize
	    that.scene = scene;
	    that.resize();
	    that.axisHelpers = new THREE.AxisHelper(100);
	    that.scene.add(that.axisHelpers);
	};

	exports.Helpers = Helpers;


/***/ },
/* 6 */
/***/ function(module, exports) {

	/*jslint todo: true, browser: true, continue: true, white: true*/

	/**
	 * Written by Alex Canales for ShopBotTools, Inc.
	 */

	/**
	 * This file contains the class managing the GUI.
	 */

	/**
	 * Defines the different callback functions handled by the GUI.
	 *
	 * @typedef {object} GuiCallbacks
	 * @property {function} showX - For showing YZ plane (from X perspective).
	 * @property {function} showY - For showing XZ plane (from Y perspective).
	 * @property {function} showZ - For showing XY plane (from Z perspective).
	 * @property {function} displayInMm - For displaying units in millimeters.
	 * @property {function} displayInIn - For displaying units in inches.
	 * @property {function} perspective - For setting the camera in perpestive.
	 * @property {function} orthographic - For setting the camera in orthographic.
	 * @property {function} resume - For resuming the animation.
	 * @property {function} pause - For pausing the animation.
	 * @property {function} reset - For reseting the animation.
	 * @property {function} goToLine - For going to the command line.
	 */

	// The width and the height is the dimension of the domElement (for some reason,
	// when resizing the renderer, the domElement dimension is completly wrong on
	// some operating system)
	// callbacks are functions for the button
	var Gui = function(renderer, width, height, configuration, callbacks,
	        liveMode) {
	    "use strict";
	    var that = this;

	    var highlightedElt = null;

	    // Ids, classes and values according to the CSS.
	    var idGCodeDisplayer = "gcode-displayer";
	    var idGCodeContainer = "gcode-container";
	    var idGCodeLines = "gcode-lines";
	    var classGCodeLine = "gcode-line";
	    var classHighlighted = "highlighted";
	    var displayerWidthInPx = 200;
	    var classWidget = "widget";
	    var idToggle = "toggleGCode";
	    var idLoading = "loadingMessage";

	    var prefixIdLine = "gcode-line-number-";

	    if(configuration === undefined) {
	        configuration = {};
	    }

	    that.hideXButton = configuration.hideXButton || false;
	    that.hideYButton = configuration.hideYButton || false;
	    that.hideZButton = configuration.hideZButton || false;
	    that.hideGCode = configuration.hideGCode || false;

	    //Scroll the ul to the li having this line number.
	    //elt is the li element in the ul
	    //lineNumber is the lineNumber corresponding to this li
	    function scrollTo(elt, lineNumber) {
	        lineNumber--;
	        that.widgets.gcodeContainer.scrollTop = elt.offsetHeight * lineNumber;
	        that.widgets.gcodeContainer.scrollLeft = 0;
	    }

	    //Place a widget in the position
	    function placeWidget(name, x, y) {
	        that.widgets[name].style.left = x + "px";
	        that.widgets[name].style.top = y + "px";
	    }

	    /**
	     * Highlights the line at this line number.
	     *
	     * @param {number} lineNumber The number of the line to highlight.
	     */
	    that.highlight = function(lineNumber) {
	        var elt = document.getElementById(prefixIdLine + lineNumber);
	        if(elt === null || elt === highlightedElt) {
	            return;
	        }
	        if(highlightedElt !== null) {
	            highlightedElt.children[0].className = "";
	            highlightedElt.children[1].className = "";
	        }
	        elt.children[0].className = classHighlighted;
	        elt.children[1].className = classHighlighted;
	        highlightedElt = elt;
	        scrollTo(elt, lineNumber);
	    };

	    /**
	     * Set the gui according to the current state of the animation (for example:
	     * used not to have a pause button when the animation is already paused).
	     *
	     * @param {string} animationStatus "running" to set the gui for a running
	     * animation.
	     */
	    that.setStatusAnimation = function(animationStatus) {
	        if(animationStatus === "running") {
	            that.widgets.resume.hidden = true;
	            that.widgets.pause.hidden = false;
	        } else {
	            that.widgets.resume.hidden = false;
	            that.widgets.pause.hidden = true;
	        }
	    };

	    //Add an image widget, set it with the id and the position.
	    function addWidget(id, x, y, src, hide) {
	        var elt = document.createElement("img");
	        elt.id = id;
	        that.widgets[id] = elt;
	        elt.src = src;
	        elt.className = classWidget;
	        if(hide) {
	            elt.style.visibility = "hidden";
	        }
	        renderer.domElement.parentNode.appendChild(elt);
	        placeWidget(id, x, y);
	    }

	    //Set the buttons for displaying the planes. X and Y for the first button
	    function setAxesButtons(x, y, callbackX, callbackY, callbackZ) {
	        addWidget("showX", x, y, "data:image/png;base64," + Gui.xImage,
	                that.hideXButton);
	        y += Gui.iconSize + that.margin;
	        addWidget("showY", x, y, "data:image/png;base64," + Gui.yImage,
	                that.hideYButton);
	        y += Gui.iconSize + that.margin;
	        addWidget("showZ", x, y, "data:image/png;base64," + Gui.zImage,
	                that.hideZButton);

	        that.widgets.showX.onclick = function(){
	            callbackX();
	        };
	        that.widgets.showY.onclick = function(){
	            callbackY();
	        };
	        that.widgets.showZ.onclick = function(){
	            callbackZ();
	        };
	    }

	    //Set the buttons for displaying size in millimeter or inch.
	    function setUnitButtons(x, y, callbackIn, callbackMm) {
	        addWidget("displayInIn", x, y,
	                "data:image/png;base64," + Gui.inImage);
	        addWidget("displayInMm", x, y,
	                "data:image/png;base64," + Gui.mmImage);

	        that.widgets.displayInIn.onclick = function(){
	            callbackIn();
	            that.widgets.displayInIn.hidden = true;
	            that.widgets.displayInMm.hidden = false;
	        };
	        that.widgets.displayInMm.onclick = function(){
	            callbackMm();
	            that.widgets.displayInMm.hidden = true;
	            that.widgets.displayInIn.hidden = false;
	        };
	        that.widgets.displayInIn.hidden = true;
	    }

	    //Set the buttons for setting the camera in perspective or orthographic mode.
	    function setCameraButtons(x, y, callbackPers, callbackOrtho) {
	        addWidget("perspective", x, y,
	                "data:image/png;base64," + Gui.perspectiveImage);
	        addWidget("orthographic", x, y,
	                "data:image/png;base64," + Gui.orthographicImage);

	        that.widgets.perspective.onclick = function(){
	            callbackPers();
	            that.widgets.perspective.hidden = true;
	            that.widgets.orthographic.hidden = false;
	        };
	        that.widgets.orthographic.onclick = function(){
	            callbackOrtho();
	            that.widgets.orthographic.hidden = true;
	            that.widgets.perspective.hidden = false;
	        };
	        that.widgets.perspective.hidden = true;
	    }

	    //Set the buttons for managing the animation.
	    function setAnimationButtons(y, callResume, callPause, callReset) {
	        var x = (width / 2) - 34;  //middle - size image - 5 / 2

	        addWidget("resume", x, y,
	                "data:image/png;base64," + Gui.resumeImage);
	        addWidget("pause", x, y,
	                "data:image/png;base64," + Gui.pauseImage);
	        x += 37;
	        addWidget("reset", x, y,
	                "data:image/png;base64," + Gui.resetImage);

	        that.widgets.resume.onclick = function(){
	            callResume();
	            that.widgets.resume.hidden = true;
	            that.widgets.pause.hidden = false;
	        };
	        that.widgets.pause.onclick = function(){
	            callPause();
	            that.widgets.resume.hidden = false;
	            that.widgets.pause.hidden = true;
	        };
	        that.widgets.pause.hidden = true;

	        that.widgets.reset.onclick = function(){
	            callReset();
	            that.widgets.resume.hidden = false;
	            that.widgets.pause.hidden = true;
	        };
	    }

	    // Set the interface for displaying the gcode
	    function setGCodeInterface(y) {
	        var gcodeDisplayer = document.createElement("div");
	        gcodeDisplayer.id = idGCodeDisplayer;
	        if(that.hideGCode) {
	            gcodeDisplayer.style.visibility = "hidden";
	        }
	        renderer.domElement.parentNode.appendChild(gcodeDisplayer);
	        that.widgets[idGCodeDisplayer] = gcodeDisplayer;
	        placeWidget(idGCodeDisplayer, ((width - displayerWidthInPx) / 2), y);

	        var p = document.createElement("p");
	        p.id = idToggle;
	        p.innerHTML = "Toggle G-Code";
	        gcodeDisplayer.appendChild(p);

	        var gcodeContainer = document.createElement("div");
	        gcodeContainer.id = idGCodeContainer;
	        gcodeContainer.hidden = true;
	        gcodeDisplayer.appendChild(gcodeContainer);

	        var table = document.createElement("table");
	        table.id = idGCodeLines;
	        gcodeContainer.appendChild(table);

	        p.onclick = function() {
	            gcodeContainer.hidden = !gcodeContainer.hidden;
	        };

	        that.widgets.gcodeContainer = gcodeContainer;
	        that.widgets.gcodeLines = table;
	    }

	    function callbackGoToLineFactory(lineNumber) {
	        return function() {
	            return that.cbGoToLine(lineNumber);
	        };
	    }

	    /**
	     * Set the GCode in the GUI.
	     *
	     * @param {array} gcode The array in the parsed gcode.
	     */
	    that.setGCode = function(gcode) {
	        var i = 0;
	        var tr, th, td;

	        that.widgets.gcodeLines.innerHTML = "";
	        for(i=0; i < gcode.length; i++) {
	            th = document.createElement("th");
	            th.innerHTML = i + 1;
	            td = document.createElement("td");
	            td.innerHTML = gcode[i];
	            tr = document.createElement("tr");
	            tr.appendChild(th);
	            tr.appendChild(td);
	            tr.className = classGCodeLine;
	            tr.id = prefixIdLine + (i+1);
	            that.widgets.gcodeLines.appendChild(tr);
	            if(liveMode === false) {
	                tr.onclick = callbackGoToLineFactory(i+1);
	            }
	        }

	        //We do not care of the tr, just here for knowing the height
	        if(tr !== undefined) {
	            scrollTo(tr, 0);
	        }
	    };

	    function createLoadingMessage() {
	        var div = document.createElement("div");
	        var p = document.createElement("p");
	        p.innerHTML = "Loading file. Please wait.";
	        div.appendChild(p);

	        div.id = idLoading;
	        renderer.domElement.parentNode.appendChild(div);

	        //Stupid trick to set the correct width and height of the div:
	        that.displayLoadingMessage();
	        that.hideLoadingMessage();
	    }

	    function loadingMessageDisplayed() {
	        var message = document.getElementById(idLoading);
	        if(message === null) {
	            return false;
	        }
	        return message.style.display !== "none";
	    }

	    // Show a message for the loading
	    that.displayLoadingMessage = function() {
	        var elt = document.getElementById(idLoading);
	        elt.style.display = "inline-block"; //Put that before doing calculus
	        var x = (width - elt.offsetWidth) / 2;
	        var y = (height - elt.offsetHeight) / 2;
	        elt.style.left = x + "px";
	        elt.style.top = y + "px";
	    };

	    // Hide a message for the loading
	    that.hideLoadingMessage = function() {
	        if(loadingMessageDisplayed() === true) {
	            document.getElementById(idLoading).style.display = "none";
	        }
	    };

	    /**
	     * To call when the canvas or container has resized
	     */
	    that.resized = function(newWidth, newHight) {
	        var s = Gui.iconSize, m = that.margin;
	        width = newWidth;
	        height = newHight;

	        var x = m, y = m;
	        placeWidget("showX", x, y);
	        placeWidget("showY", x, y + s + m);
	        placeWidget("showZ", x, y + (s + m) * 2);

	        x = m;
	        y = height - m - s;
	        placeWidget("displayInIn", x, y);
	        placeWidget("displayInMm", x, y);

	        x = width - m - s;
	        y = height - m - s;
	        placeWidget("perspective", x, y);
	        placeWidget("orthographic", x, y);

	        if(liveMode === false) {
	            x = (width / 2) - s - m / 2;
	            y = height - m - s;
	            placeWidget("resume", x, y);
	            placeWidget("pause", x, y);
	            placeWidget("reset", (width / 2) + m / 2, y);
	        }

	        x = (width - displayerWidthInPx) / 2;
	        y = m;
	        placeWidget(idGCodeDisplayer, x, y);
	    };

	    //intialize
	    that.widgets = {};

	    //If not one of this, the positionning will not work correctly
	    if(renderer.domElement.parentNode.style.position !== "absolute" &&
	            renderer.domElement.parentNode.style.position !== "relative") {
	        renderer.domElement.parentNode.style.position = "relative";
	    }

	    that.margin = 5; //margin between the icons

	    var x = 5, y = 5;

	    setAxesButtons(x, y, callbacks.showX, callbacks.showY, callbacks.showZ);


	    y = height - Gui.iconSize - that.margin;
	    setUnitButtons(x, y, callbacks.displayInIn, callbacks.displayInMm);

	    x = width - Gui.iconSize - that.margin;
	    setCameraButtons(x, y, callbacks.perspective, callbacks.orthographic);

	    setGCodeInterface(5);
	    if(liveMode === false) {
	        that.cbGoToLine = callbacks.goToLine;

	        y = height - Gui.iconSize - that.margin;
	        setAnimationButtons(y, callbacks.resume, callbacks.pause,
	                callbacks.reset);
	    }

	    createLoadingMessage();
	};

	Gui.iconSize = 32;

	Gui.xImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAANcSURB%0AVFiFvZdZSFVRFIa/c%2B7tJoalls2DJkllUTQgTTSR9FKZjVDZSEhE1EMPDVBZlllRPQQZSVehhx6C%0AijIlX5ooTCSKBhq1ycIoyiK7nqGHhZ179Ny8g7cfDpy9Nuz97bXWXntv5fkSxrhdnPSo9MBE4X9I%0AwfTpNGg%2BcpXXS6lK7sp4q1MF04g6gwnUNVKletz0sPVk5cOwWVEHUACPiyTV5vauvSFjGSw%2BCqor%0A6hCYKKrNsOIUJAyApFTI3Bp9AMACSB4HKRny3ykGpqyHLt3/E4CiwEovGDrozeD7CTFxsOhw1AHc%0AAqDCibli2XAR3j%2BEizvB1MUW1xPSpsr/o3Joagw8Yto0iEuCr2/h1d0gAQwdPr8Si/Ybmr5bbYCf%0AXyQnksfDjSI4m%2Bs8WkoGbKkUjx6e2u7k4J8DNpn2pqGBdyU0N0lupM92WEpnyCmW3XPtCLy4FSaA%0AEqAY1j%2BBK3ulP%2Bc0xMbb%2B7PyoW86fHwKl3YFNbkzAIBpOpqpKITaexDfD7ILLfvgCTBzs1TQ0nXQ%0A/CsCgEAeAHsoJq%2BTUHhiYZVXXF9RCC9vBz25M0B7qn8CV/IEdHkRLDkOvdKg/jFc3hPycKGFoEUV%0Ah6C2ChIHiicMDbyrxTORAwRxIhsaVB6z2reKBSgMhR4CkLjP2W21R82F2IQOAlAU2tSB1pq3T%2BL%2B%0A/qHsim59YGF4ZTt0D6ROhBmbJAwla%2BBMjsR%2B0hrnAhUWQKAk9N9y5QVQVy2Fp2yf9DsVqNAB/pGE%0A8w9AzyGyFcvyLXv5QYGJ7wfzCyIFCKDUiTB9o70YtcjQoHQtaD45K4ZnRgDglIQtrldUcX3tvbYj%0AvXsAV/dbBSomLkwAJ2UXOLu%2Btcry4U0NdE%2BGrP1BDe12tPonoeqCZ9fh%2BU0Z/F/VztCgaBEMGisH%0Ak%2BqSLbrgEJzbBI0NQQC0PowMHWrOB7UaQC4y/pcZRYX0TNhRA3e8cDlPrn0BAUwT%2Bo6QZOoIdUkE%0AxQ0J/eVWNXYxXNj%2Bd1HOHhg6Q76Olruz3Lj7j4b7FwDdAWDPyI6dNHEgbKuSUNRVQ8lq%2BP7JYkJp%0Ar/BHKNOEH5%2BhZBXUVtv7FEy3T6fBhJSoPYu/fYC8kW3Kuwn4dBrcmo/cukZOelwkRed5rrc1%2BT3P%0A/wBMuRZf6qpSxAAAAABJRU5ErkJggg%3D%3D%0A";
	Gui.yImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAALPSURB%0AVFiFvZddSJNRGMd/Z1tLE7WZCxULpYssU8oSK%2BgmyJs%2BKCjTpFQIkS4KIgurm4TuiiIT1Kt5FWSW%0AUlD0DRKCmERhhJa5iwy/LnIa2/Td6eIgc%2Bzd3Jbv/nDgeZ/zcJ4fz/l8xfBJiixmWqwm0pEI4iGB%0A9GpMLnipEz/L6ctJodjfaQLpM5xBAk4XfSarhfSAnqM3YcsBwwEEYDVjNwWUPSUDSiqh7A6YzIZD%0AIBGmAMfpNrBtAPsmKK03HgDwA%2BTsgtwSZa9KgH21kLQuTgBCQJUDfBpo8%2BCdg4RkOHHLcACLAjBB%0A8xHlOdcNv75A93WQmvIVHlZV%2Bf0VxgbDj5iVD5lbYd4Nn58uC6Aq4NNgakS1BQ%2B4Z5Q97VRRGXlQ%0A%2BxAuvIQ1ttCjJabC%2BecqNmPzssn9AEGSgZ%2BvbsNwD6zNUjsklMruqkU80guvw8SFBRA6h6H0gaMa%0APLOwpwp2HAuOKTgIe6vB%2B1fF%2BrQYAQCkDPZNjah1AVDRHLhDElOhskXZTxpgfCii5PoAehVY1Nsm%0AGHoPqZlQ0eT3l98DWzb8%2BADv7kecXB8gnKQPHDXgdkFxBRQdh8JDsPsMeOZU6aO8RyKfgkVNj0Ln%0AZWWfaobKVmU/ugQT36NKHgIgghu5pxUGX0DyerUzvr1RvhgU3RQsSkp4fMX/3XExfNWiAhCCoHNA%0AT26Xvv3fAHFW9IvQeID4PAvDAMRXsS9CwwDirNgXoWsC2spUc02EjrNlw9kHkGzX7bYEecJdRkvl%0AmYOPHcvHCRPkl8K1Aeh1wLNG9ewLCSAlZG1Tj9KVUFIaCIuqRGk97CyDrqsw0BkCQAjI26/aSsuy%0AWr0ts7fDpy5A0wG4UbCySdM2QkOfmgpnP7TXwMy4nwlh8J6TEmanoL0aRvsD%2BwTS4tWYlJBr2Pn3%0AZwwaC4J2lgS8GpOWBS91ThctVjN2Y37PdR6nS37P/wHP1Np37b4u3wAAAABJRU5ErkJggg%3D%3D%0A";
	Gui.zImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAL2SURB%0AVFiFvZdbSBRRGMd/M7valmleKc1ME0Izo0wzCF%2B6GAWVJF4yIosSkxB68CH1RcGHLlAvihmhQpJB%0AF4UIekioSMnEioKkyBRRiTXykmWr4/RwCFt3xp11d/3DMN98Z875fnPOmXO%2BI33OIclsotZXJhQV%0AiaWQhGpTsM7YKJS%2B5tIZHUDKXKEM6qzXGVSgf4JO2ddMqF1JRhXE7/M6gAT4mgiT7bo9YA2kHofs%0AayCbvA6BiiTbOU7UQdA6CIuF9BLvAwBzANHJEJMqbB8LpBWAX8gSAUgSnGyAWQWUabBNgsUfsq56%0AHcAsAGSoPiw8Ra0w%2BB5ay0FVhC9iM4THu9by8EcY%2BmAQYFaBkV7hmfkDU%2BNzzwApuXCwzDWAx1Xi%0AIwwBOEi1f%2Bx7DS/qnAdduwU27BS29Yvz9zUBJI3F8F2ruBbSqnAo7RL2qyZorzcEIGt6VVXTrSsf%0ACxS1QGAEDLyB2wWGqzoCaPWAMx2rhugdMP4Nqo%2BA7ZcbAK5q7wXYdVr8vjdz4MeAS9XdG4K4PZB5%0AWdjNxfDpmUvBdQAMDkHIejjbDLIZ2hvgea3LwXUADMhnORQ%2BgJWh0NsBTYWLakYbQJJwWAfml%2BfX%0AQ1QSjA3DjSyxeHkMwJkOlEJyDkxPQU0GjA4uOrg%2BgN4kTNgPhyqEfec89HW6FVwHQGcSrt4IZ5pF%0AovL0Ory85XZwHQANWfzh3ENYEQg9bXDPc8mKzl4wbwjyaiB8k7B/j0JetfOWrb3w5NIiALQUFjtn%0AbztqqAq9HW4AzJ%2BEreWup2eT38U9KBIyr8DdYpiwGgDQ2ox62lwLbteeDAnpUNYNHQ3wqFLsG7oA%0AqipSsDTjW%2BqC8gsGySx6Ir0EtmdDSyl039cBkCSI2y0uT8u8TOQOkVvhbQugaABUJHo2aHAUXOwU%0AQ9HfBY2nRN7wjwlpoYXfA1JV%2BDkCjfnQ12VfJqGabQpWFWK8diweG4LKRIc/SwVsClbzjI3C/glq%0AfU2Eeed4rji6/jue/wVU5dN0Vmb7TgAAAABJRU5ErkJggg%3D%3D%0A";
	Gui.mmImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAJOSURB%0AVFiF7ZdLaBNhFIW/mYYIVotCQkUt1ghVQbFqXbgSBDeuBJUK2deuFRVbXRTcCIIbF9WdID4KBQtF%0AEESxlr4CIq1QbW3TqNFKEltpEnGa5Lj4U2KSulFINnNgGObOPf85c%2B//YKzpVg54auj22vgQFpWA%0AhZwssYxDuxU%2Bw1hjHYcqIvwHBESWGLO9HnyVFgewAG8NfrtiZV8NwrKrJp6Ha8A14BrwAFDfBFv3%0Awete2HUUmo6Ak4aRe7DwCTxe2H8StuyBxJyJL/8sjNLQDBsbYKIfmk/AthZIJmD4LqQSsKYWWlrB%0AvwO%2BTkLoAeSyhhsNElbPOUmSnt2UfsxLUwNSelFaiklXd0pTL6Vv09KHQSnjSDND0llbasNcK7yx%0A%2B9L3j4bvpKXYjNQRkKJvpeiEFB6Vcjkp9EhqQ9EgYU9RPTbths6A%2BXrfduiahIuD8OoO9F0BCQ6e%0AhrYe2HscxvsL3Lp6WP4FHQHIZSBwGC4NweVRwx24bfKOnYdTN%2BDJNZiaKJkDfZ1GHCAehtkRU/7%2B%0ALiMOpk0Zx7SsFL0XjDjA7LBpVzJeEAcIPTT3PL%2B4AvPviwdMJYyRjFOIKQfpBVjnK89NxotjyQQs%0ARsvzANb7gdJVkF0uTpbKY%2BZFeehveauNCZA/A6u%2BDF0DZhJGQvD0emFzWMGbx7B2QznrxS34PF54%0Afve8fAKC2YjSi8WxXNZoRUIAWNEg4c21NP7HR/wzvqSYq3oLXAOuAdeAjbXayVIhWMh2ssSq4UCA%0AkyXmyTi0R5bo9tbgr8bv%2BW%2BGwiGU8EX/RAAAAABJRU5ErkJggg%3D%3D%0A";
	Gui.inImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFxSURB%0AVFiF7ZcxS0JRFMd/972HDUU0KIRE6FAZDVESTRkEQbRbQVtC%2BAkkKvoEBo3u1djQFNRqi4M0VBAJ%0A5pBRFgRq0dPnazCw0OFC9h7G%2B0/3HM4958c9cA5X3C4zqakkXApuTARWSGDqBoWqTlRkV0j5epmy%0ApPA3mUCuSEpxabitLg4gAJeKR7Hs2VvJRCi2Ff%2BSA9BBALFzmFm3EWBwAvq8bQfQpCNjXqh82Agw%0AMgePN5C/qtveMegPQPoIRudhOARvr3B5Ag/X0mnlWxA5gGC4YQfDEDmEpT1Y24ehECxswHYa/NN/%0AANBKWhe4fbDph/gs7ASg9AyLWxYBABzFoPJeP5df4OIYBsYtAqhV4Snz01cqQI/8fvslgAFmrdkv%0A5PdbB03C/wogP4jOdiGTbNiZJJzGm%2BMySVBU6bTifpWstxuf9I02Kl/mzvYWOAAOgAOgIDBtqy4w%0AFd2gYAeBCegGBa2qE80VSbhUPHZ8zz8BsrxiWwdVOocAAAAASUVORK5CYII%3D%0A";
	Gui.perspectiveImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAQfSURB%0AVFiFvZd/TJR1HMdfDxw3Twq1AzE24XA4NVJLx1kbf6RZ0wzNwSaYM4lM/JGtWj%2BcbQG2fkJzKx1M%0AGoqiaUlmEhSjXNNIsLWFGAhxRwYLD9SCE70Dn/74yI7ruLvnOTff/3y35/l83u/383k%2Bz/fzfZS2%0AVcwzhFNsDCMaFYU7AQXVNYxjyEWuYsukwRJFyh0RHgUV6OynwWA0EK05S1EgdgZYrJBoldXlBHsj%0A2BrA3gCX/9RGBRjDiTEELHvUFI9QohUSUmD8RBh2w1%2B/QWcjRJhg9jJ47BVQwuDfHjHU2egx5uzz%0AVwZF6XoaW1wkFiJMYEkZJbgA7omXQMcfYDsjT2hrgIu/gvu6N9m4KEiYLxwWq6wj%2Bb0dtyo0Yuws%0AuAfpdmL3GEjJhOcOSUL7KWipkyTbGf9PEAxRsR4zsxbDtIflemkWNH5GtxN7mE%2BSsw%2Bip0F3M5z7%0AJnRxkNfRdAJ6WoVzoNcnxNfAm9Mlaf1heKEKzJbQDUyeDltrIHs/nP8O8u7TYODaFTiwAYoeAXMi%0A5J%2BHtDwwGLULR5gk560maeQPU6FsLfQ7fEINfknafoQdc2Hxy0L2wEqoyIWO%2BsDiMxfB6t0waSrU%0AvAfV78CQy2%2B4bwVGY9gN374PBbOhvwdeOw3Z5RBp9o2dGCf3XqqDnjYp99d5AcWDGxjBpXbY%2BTjs%0AWQXJSyDvHDy09haDAR59EfJbICkVPl4Gu9Kgr1MTtf9XMBZ%2B%2BRxaf4CMQli3F6xZMCEOpsyE2kKo%0Aehvcg7ooPRW4dlXWOWmBMwZ6Ye86%2BGgRxM8HVOmVY9uDi89d4a3lZaC5Bn4uh2f3y34fDBdOgqMd%0AWk/C3y3B4%2BOShfunMtHyMQDy%2BfVcgM1fgWlCcFKtGD8JNh6Tza1io9ctbwPu61CcLgnZ%2B2T63S7C%0AwiGnAsbdBSUZMHQjgAGAKxfFRPJSWLr99g2kfwAzFsLup%2BBql6%2B/MZPaT0Hl67A8H%2BY8Gbr4gjWy%0AkR3aIkNtDPjfB%2Bp2Qv0%2ByDkI987SLz71QVhTIjynP/UbFngjOrhJJllupcx7rYiKhc3HZdv%2B4tWA%0AoYENjDRlpFl7U4ZHwPNH4OYQ7MmUNWQDIGe80kzphSXbghvI%2BgTi58Gu5WPOf/0GAFq%2Bh8o3YMUO%0AuP8J/3ELt0DqeijPga4mTdTaDADUFkF9OeQcgMlJvveTUiGjCKoK4OwRzbTaDYA0paMDNh33bkpz%0AAuQeheZqOFGgi1KfAfcglKTD3TEyDVHAaIINR8F5GcqeAfWmLkp94xhkzpeuhq3VgCpH8RsD8K4V%0ABv/RTaevAiP4vRa%2B3CaHESVMPrdL7SFRGVBQQ8qsLZSntzfKiTcUKKgG1zAOFRJ1zz1VlXf%2Bv%2Bmm%0AOR1wDeMwDLnI7eyn2BhOjP7f89DER/%2Be/weIpWa3ouqgJAAAAABJRU5ErkJggg%3D%3D%0A";
	Gui.orthographicImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAQ0SURB%0AVFiFrZd/TJR1HMdf37vzjgjQSixBjf6oWa2bsDszlL/65RY0FRSWmqOV2PjD2iTwZnq2iUJZalrC%0Aai2VNRc617W1YrAVlXKWLiiE2fSoQRrLkIbpcXdPf3yO4HjuuOeZvrdn%2Bz7P9/P9/Pp%2BP%2B/v51Hn%0AS8mzWTlotzATDYUJKKsVAC0cNrMMFFowzGAoyAZ1sQx/TgZucxqAubmwtlHGh9fD72dNLdeAvn/w%0AW%2Bw2Zppa6UiDlW%2BDxw8Wqzwev3xzpBlWowC7lUybqbQ7C6FsP6Rnwokt0LIbtAgseRFK3gJXKRzd%0ACGeajenTUBZDgtNnQ/khqPRBfxd4H4Iv6yASEgfaG2HbfLjwPVR8KnJ3zjOkemoHlAUK1sMbPfDg%0AE/DROjhQBH/16WWHBqBhJRx4FuY4Yfs5eLpatmgqE/2ruZh1Ozm6mbkLYE0D3OuCbz%2BA5iq4Pmwo%0AKuypULgVntwkGTtSAQG/TmxghIA%2BA/ZUWLELPD%2BAzQF1%2BaLAqHGA4DU4XgO1LggHoeakBJOSoRON%0AzcCi52FFHWTMgmOvQeseiJis8cmwWOHxV6C4Hob/hOPVcOoQEC8Di8shPCpjVylkO2/OOIgOV6mM%0AIyF4bF2sfzFv4VG43As7XPLu8UPpXkhJN2/YngpFXtjcIVtZv1h0jwUY1wFNA6WE1eryoXkT5JfD%0A9h7IKzFu3FkI3m54qgq%2BqIWdbrhwCuJQjt6BMaFICFr3Ruv7pLH6nsgXAz8LX/i8EArKvFIICSdy%0AgGgGJmJoABpKxuvb262v73h8sb9QzxdKRYMch02XgckOjKHTB71t8MzrsGwHuMukPEM3pMRy3Ab4%0AQp%2BBSQ5EiLdP/%2BPGiNT3mWNitPo7%2Bd7fBbsWQeB04rVgNAMGrofAaahdCN5fAE3GkVDydSRzIN4Z%0ASIRICK78JlkzZBwDh3CqM3ArEGcL9FVgrisz6wG3PgNm5JNmQNNATX1/x0JLLhLjgCWJA2l3wbwF%0AkFdsTrEROAulx0ifNYUDLbvh736oaJZn%2BuybNzwjS3RV%2BuDqJWh5M2Y6tgx/%2Bgy6v4KlNbB0s9Cq%0Abxu0vRslKRNQCh5dC6vegdsyoG0fnPAImU2AnnVGr8sFUuuCP87Bqj1Q9Q1kPZzIkv7T3Q/Aq61Q%0A/jFc6ROWPLpRZzy%2BA2Po74L6aDuW/QhsOSutms0xLjPpQDEtRXqArZ2QszDalrmh78eEZmwJZ8YM%0AtDfKRVS2T27B3GJo2gA9rbGy9xfAmka4Zz50fg6fVApTJkHirjgenEXw3HswIxs6jsAdc6S0LvfC%0Akpdg%2BJJEHe35kmFghIANZaKYO33wazss3wkFFdLxoiT6r9%2BXQ/bvVcPqUGi2YJhBDe4zzGfXhqDp%0AZehoghcOyzZ9uFq6JhPQgGCYQXW%2BmFybnYN2K5lmf8%2BZ5lBENAgHzVHihN/z/wDatoOI6GwhGQAA%0AAABJRU5ErkJggg%3D%3D%0A";
	Gui.resumeImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAHVSURB%0AVFiFxZexSxtRHMc/73KNJbUaUYdYhyyKldChEHCxiFv/Ah1EcJFMqeJYgigOpVu3OHa0cwrtUNRV%0AKLa2oKhBswhydsrQcknudUiOBHnRe%2Bbu8p0e936P34fv98d7nDib46UZIR81GEIiCEMCadewqjYZ%0AcTHPQbKPdCiNWySBUpkDI2oyFHZzAAFEIwwbStuTaYjFg6eQCEO5kXoNW%2BcwvQwi2LFQAzgOPBmE%0AhW1Y24fRFyEDSKe5HpuGt99h7gM87gsJAHmryoTZLGyewNSir7G0j0Cl/gQsfYS1PRhJBQgg2wC4%0AGnsFucNGLE%2B7AADNWDYasYQO4Co%2B0ohlFxKTXQBwNT4DuR/asegN4X2KPGrEcuw5Fv8caFX8WT2W%0A1W%2BQeN4FAFcTs5D7WY%2Blp1cDwKn5AwD1WAaTEBtQbpvqU1L9WVdWET6twFGhbYka4KFD6KryF76%2B%0Ahy/voPLvzlI1QCczcFSAnSzcXHgq9w/AKsLOG/j1WetY5wAadvsPoGm3d4D7hvCBdnsHaOdAh3Z3%0ABuCD3RoALReRj3ZrADiB2O0d4Oo3rE/Cn8vAGjcBhOLivz4NvDEAAmnYNSyfnh4tScCuYZlVm0yp%0ATD4aYbgbv%2Bf/AR%2BUsmHnLqDQAAAAAElFTkSuQmCC%0A";
	Gui.pauseImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAD5SURB%0AVFiF7ZexagJBEIa/vVuusNBGi9jEYJlODIG0NkIeIIHkASx9gVS%2BgKUv4CMEbGyFSNpUIZErjMVV%0AKoSweGyKa07uVivPZj6YZth/52O6UZ8PtLTPKPCoYlEUgcKamGhn6KnFI/NGmZtCBqewQLhl7gWa%0AatHDARQQ%2BNR07tqbd0m5WK/gbbzfu32CyoU78zVLKo1F6dzH1124f3F/Fr5nBTp9uGy7M6%2BDrADg%0AuRPFIAIiIAIiIAIiIAIiIAIiIAL5d8HHBP427tR6le1Nh8cPkxzU8pnveomrQ5an4ueXhWdiInuG%0A4RYwMZHeGXrhllHgUzvHef4PFcVDiuVitGQAAAAASUVORK5CYII%3D%0A";
	Gui.resetImage = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlz%0AAAAKFgAAChYBipWYbQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAOdSURB%0AVFiFxZddaBRXFIC/mdlsYlI1xkRswkpIozFqghFDVCJWWRXiDyho1GhVUEgR0VbIg1UqviioeWuw%0ACi2CNX1QUV9ckgoaBDXiH7ixbdr8oSuaJsTEaHazs9OH03Td7m5m1t3qebln7t/57r3nnntGaa1k%0Ajk3jpF0lEwOFDyEKhk%2Bn2%2B%2BjWmnfQHPuOEo/iOF3xAA6B2hW7TYyEzpz0hhIGWfaTQHsGlm2uLdd%0A1cAxG6Y7odAJ%2BeVwuAiG%2Bs3HGii29zKaNhFKK8VoweeQOiHY1tMBL/%2BwPJVqqVdOUej3UD8ULoWS%0ANaHGAcZPBudXoFpb2%2BgAqgYrv4UD96F4VbBeH4ZT6%2BHhpfAxthRYVwv7m2FibhwAigrbzsCqQ7Ka%0AuZWh7fownK6ER5eDdQEdbtRBwA%2BOEqi5CZ/OeE%2BAdSegrEr0hmNwZnt4H79PdmIEousenNsFxxbC%0AYA%2Bk58AeF6RlxAhQsBiW7BHddRQu1MiKI8m/EFegpVHq2m7D8UXw9hVMcMCW0zEAqBpsqgNFgV%2Bv%0AwaX9UQeHQdx8x5DHDT99KXrJWpi2yCJAoRMmT5fzPLcLDMMcAMDvhZ7O0Lq79fD7ddGdX1sEKNsi%0A5ZNGePGbNeOjSWOtlMUrw69sRID8cinvnY/fOEBLg%2ByOokLePBOAlLGQMUX0p48SA%2BD3QtcD0R2z%0ATQA%2ByRTnA%2Bh7lhgAgDe9UtpTTQD83qBuS04cQCDwj7Xw8BwK8PaVeD9AhiNxAFmfSfnfWxIG4B0E%0Az2PR8xYkxnhqOkzKF/15iwkAQGuTlGVVQX%2BIR0o3gpYEg73QfscCQNP3EnxyimBWRXzGbcnyNAPc%0A/TnUx6ICeNzgvir6prqIwcOyVHwDk6bC8BD8UhuxS%2BTHqH63JB0ZU2BHfcTrYyrzvoCKA6K7jkL3%0AnzEA/NUGZ6vlKGYuh70N8qpZEVWDFQdh6w/iQ24XuI5E7a7tK2bvWDvpYS2ex9DbBcUrJLNZuBMU%0ADV62gvd1ZMMla2Hrj1C2WUJvaxN8t1qOIIIMDNOnPKuiPTuN3KiIM5fD5lPBEB3QxZs9bolwiipZ%0AT978YOJhBCSJuXwweh4BeAbpMAcASE6DZTVQvgPSs6P3C%2Bjw4CI0HIeO5lGnjA1gRFQNCpZA7lzI%0AngVJKWK0/wW03ZK3v89jaaoRgNj%2BCwK65AlPGmMaNpqoKFhMef4HUTBUn073xyAwAJ9Ot83vo7pz%0AgJN2jayP8Xv%2BN5BEH7zJLGnvAAAAAElFTkSuQmCC%0A";

	exports.Gui = Gui;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/*jslint todo: true, browser: true, continue: true, white: true*/

	/**
	 * Written by Alex Canales for ShopBotTools, Inc.
	 */

	/**
	 * This file contains the class managing the animation of the bit.
	 */

	var THREE = __webpack_require__(1);
	var util = __webpack_require__(3);

	//refreshFunction is the function to refresh the display/render the scene
	//path is the instance of the class Path
	var Animation = function(scene, refreshFunction, gui, path, fps,
	        initialPosition) {
	    "use strict";
	    var that = this;

	    var lengthBit = 1;
	    var G0Feedrate = 120;

	    //Get the position of the tip of the bit according to the meshes of
	    //the path class.
	    function getRelativeBitPosition() {
	        var pos = that.bit.position;
	        return {
	            x : pos.x - that.initialPosition.x,
	            y : pos.y - that.initialPosition.y,
	            z : pos.z - that.initialPosition.z
	        };
	    }

	    function setBitPosition(point) {
	        that.bit.position.set(point.x, point.y, point.z);
	    }

	    function translateBit(vector) {
	        that.bit.position.add(vector);
	    }

	    //Used to have an smooth animation
	    //Returns the time elapsed between each update.
	    function calculateDeltaTime() {
	        var newTime = new Date().getTime();
	        var deltaTime = newTime - that.lastTime;
	        that.lastTime = newTime;
	        return deltaTime;
	    }

	    //Check if the animation is starting to animate a new path
	    function isStartingPath() {
	        if(that.iPath === 0) {
	            return true;
	        }
	        var currentCommand = that.currentPath[that.iPath].commandNumber;
	        var previousCommand = that.currentPath[that.iPath-1].commandNumber;

	        return (currentCommand !== previousCommand);
	    }

	    //Check if the animation is ending the animation of a path
	    function isEndingPath() {
	        if(that.iPath === 0) {
	            return false;
	        }
	        if(that.iPath === that.currentPath.length - 1) {
	            return true;
	        }
	        var currentCommand = that.currentPath[that.iPath].commandNumber;
	        var nextCommand = that.currentPath[that.iPath+1].commandNumber;

	        return (currentCommand !== nextCommand);
	    }

	    //Warns the path class of the current position
	    //changedIndex {bool}, if true, means that the point reached the current point
	    function warnPath(changedIndex) {
	        var pointPath = that.currentPath[that.iPath];
	        if(changedIndex === false) {
	            that.path.isReachingPoint(pointPath, getRelativeBitPosition());
	        } else {
	            if(isStartingPath() === true) {
	                that.path.startPath(pointPath);
	            } else if(isEndingPath() === true) {
	                that.path.endPath(pointPath);
	            } else {
	                that.path.reachedIntermediate(pointPath);
	            }
	        }
	    }

	    function setCurrentSpeed() {
	        if(that.currentPath.length === 0) {
	            return;
	        }
	        //We use in/ms here and feedrate is in in/min
	        var line = that.currentPath[that.iPath];
	        if(line.type === "G0") {
	            that.currentSpeed = G0Feedrate / 60000;
	        } else {
	            that.currentSpeed = that.currentPath[that.iPath].feedrate / 60000;
	        }
	    }

	    //Check if need to change index of the path and do the appropriate operations
	    //return true if continuing the animation, else false
	    function checkChangeIndexPath() {
	        //While instead of if because we can have commands that have same
	        //start and end points
	        while(that.iPath < that.currentPath.length &&
	                util.samePosition(that.currentPath[that.iPath].point,
	                    getRelativeBitPosition()) === true) {
	            warnPath(true);
	            that.iPath++;

	            if(that.iPath >= that.currentPath.length) {
	                that.isInPause = true;
	                that.gui.setStatusAnimation("pause");
	                return false;
	            }
	            that.gui.highlight(that.currentPath[that.iPath].lineNumber);
	            setCurrentSpeed();
	        }
	        return true;
	    }

	    //deltaDistance : the distance to make
	    //returns true if can continue animation
	    function animateBit(deltaTime) {
	        var deltaDistance = that.currentSpeed * deltaTime;
	        var destination = that.currentPath[that.iPath].point;
	        var position = getRelativeBitPosition();
	        var translation = {
	            x : destination.x - position.x,
	            y : destination.y - position.y,
	            z : destination.z - position.z
	        };
	        var distance2 = translation.x * translation.x;
	        distance2 += translation.y * translation.y;
	        distance2 += translation.z * translation.z;
	        var length = Math.sqrt(distance2);

	        if(length > deltaDistance) {
	            translation.x = translation.x / length * deltaDistance;
	            translation.y = translation.y / length * deltaDistance;
	            translation.z = translation.z / length * deltaDistance;
	            translateBit(translation);
	            warnPath(false);
	            return true;
	        }

	        setBitPosition(destination);
	        deltaTime -= length / that.currentSpeed;
	        if(checkChangeIndexPath() === false) {
	            return false;
	        }

	        return animateBit(deltaTime);
	    }

	    // Updates the position and do the logical for the animation.
	    function update() {
	        var deltaTime = calculateDeltaTime(); //Must be here to update each time
	        if(that.isPaused() === true) {
	            return;
	        }

	        animateBit(deltaTime);

	        that.refreshFunction();
	    }

	    /**
	     * Returns if the animation is paused.
	     *
	     * @return {boolean} True if the animation is paused.
	     */
	    that.isPaused = function() {
	        return that.isInPause === true;
	    };

	    /**
	     * Returns if the animation is running.
	     *
	     * @return {boolean} True if the animation is running.
	     */
	    that.isRunning = function() {
	        return that.isInPause === false;
	    };

	    //Returns the index of the point in path associated to this lineNumber
	    // returns -1 if nothing found
	    function findIndexPath(lineNumber) {
	        var i = 0;
	        for(i=0; i < that.currentPath.length; i++) {
	            if(that.currentPath[i].lineNumber === lineNumber) {
	                return i;
	            }
	        }
	        return -1;
	    }

	    /**
	     * Starts the animation according to the command in the line number given
	     * (the animation is paused).
	     *
	     * @param {number} lineNumber The line number of the command.
	     * @return {boolean} Returns true if start the animation; false if problem.
	     */
	    that.goToLine = function(lineNumber) {
	        that.path.redoMeshes();
	        that.pause();
	        that.currentPath = that.path.getPath();
	        var iLine = findIndexPath(lineNumber);
	        var pos = { x : 0, y : 0, z : 0 };
	        var pointPath;

	        if(iLine === -1) {
	            return false;
	        }

	        for(that.iPath=0; that.iPath <= iLine; that.iPath++) {
	            pointPath = that.currentPath[that.iPath];
	            if(isStartingPath() === true) {
	                that.path.startPath(pointPath);
	            } else if(isEndingPath() === true) {
	                that.path.endPath(pointPath);
	            } else {
	                that.path.reachedIntermediate(pointPath);
	            }
	        }

	        pos = that.currentPath[that.iPath-1].point;
	        that.bit.position.setX(pos.x + that.initialPosition.x);
	        that.bit.position.setY(pos.y + that.initialPosition.y);
	        that.bit.position.setZ(pos.z + that.initialPosition.z);

	        that.gui.highlight(that.currentPath[that.iPath].lineNumber);
	        setCurrentSpeed();
	        that.isInPause = true;
	        that.refreshFunction();

	        return true;
	    };

	    /**
	     * Pauses the animation.
	     */
	    that.pause = function() {
	        that.isInPause = true;
	        that.gui.setStatusAnimation("pause");
	    };

	    /**
	     * Resumes the animation.
	     */
	    that.resume = function() {
	        if(that.currentPath.length === 0) {
	            return;
	        }

	        if(that.iPath === that.currentPath.length) {
	            that.rewind();
	        }
	        that.isInPause = false;
	        that.gui.setStatusAnimation("running");
	    };

	    /**
	     * Goes back to the beginning of the animation without modifying the path.
	     */
	    that.rewind = function() {
	        setBitPosition(that.initialPosition);
	        that.iPath = 0;
	        that.path.redoMeshes();
	        setCurrentSpeed();
	        that.pause();
	        that.refreshFunction();
	    };

	    /**
	     * Resets the animation (gets the new path and goes to the beginning).
	     */
	    that.reset = function() {
	        that.rewind();
	        that.currentPath = that.path.getPath();
	        setCurrentSpeed();
	    };

	    function createBit() {
	        var material = new THREE.MeshLambertMaterial({color: 0xF07530,
	            transparent: true, opacity: 0.5});
	        var geometry = new THREE.CylinderGeometry(0, lengthBit / 5, lengthBit, 32);
	        geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
	        geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, lengthBit/2));
	        that.bit = new THREE.Mesh(geometry, material);
	        setBitPosition(that.initialPosition);
	        that.scene.add(that.bit);
	        that.refreshFunction();
	    }

	    //initialize
	    that.currentPath = [];
	    that.path = path;
	    if(initialPosition === undefined) {
	        that.initialPosition = { x : 0, y : 0, z : 0};
	    } else {
	        that.initialPosition = initialPosition;
	    }
	    that.scene = scene;
	    that.refreshFunction = refreshFunction;
	    that.gui = gui;
	    createBit();

	    that.pause();
	    that.lastTime = new Date().getTime();
	    setInterval(update, 1000 / fps);
	};

	exports.Animation = Animation;


/***/ }
/******/ ])
});
;
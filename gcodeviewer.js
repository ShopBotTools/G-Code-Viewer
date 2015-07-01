/*jslint todo: true, browser: true, continue: true */
/*global THREE */

/**
 * Written by Alex Canales for ShopBotTools, Inc.
 */

var GCodeViewer = {
    renderer : {},
    camera: {},
    scene: {},
    controls: {},
    initialized : false,
    lines: [],  //Represents the paths of the bit (lines are straight or curve)
    pathMesh : {},  // The mesh of the total path
    cncConfiguration: {},
    gcode: [],
    boardColor: 0xf08000,

    STRAIGHT : 0,
    CURVE : 1,

    initialize: function(configuration, domElement) {
        var that = GCodeViewer;
        var width = window.innerWidth, height = window.innerHeight;
        if(that.initialized === true) {
            return;
        }

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
        that.renderer.setClearColor( 0xf0f0f0 );
        that.renderer.setPixelRatio( window.devicePixelRatio );

        that.scene = new THREE.Scene();
        that.camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
        //TODO: configure OrthographicCamera
        // that.camera = new THREE.OrthographicCamera(width / - 2, width / 2,
        //         height / 2, height / - 2, 1, 1000);
        that.camera.position.x = -10;
        that.camera.position.y = 10;
        that.camera.position.z = -10;
        // that.camera.lookAt(new THREE.Vector3(that.camera.position.x, 0, that.camera.position.z));

        var light = new THREE.PointLight( 0xffffff, 0.8 );
        light.position.set(0, 1, 1);
        that.scene.add( light );

        that.controls = new THREE.OrbitControls(that.camera,
                that.renderer.domElement);
        that.controls.damping = 0.2;
        that.controls.addEventListener('change', that.render);

        that.initialized = true;
    },

    animate: function() {
        window.requestAnimationFrame(GCodeViewer.animate);
        GCodeViewer.controls.update();
    },

    render: function() {
        GCodeViewer.renderer.render(GCodeViewer.scene, GCodeViewer.camera);
    },

    //Convert a coordinate where z is the up direction to a coordinate where
    // y is the up direction
    zUpToyUp: function(point) {
        return { x : point.y, y : point.z, z : point.x};
    },

    //Convert a coordinate where y is the up direction to a coordinate where
    // z is the up direction
    yUpTozUp: function(point) {
        return { x : point.z, y : point.x, z : point.y };
    },

    //Careful, we use Z as up, THREE3D use Y as up
    addStraightTo : function(point) {
        GCodeViewer.lines.push({
            "type": GCodeViewer.STRAIGHT,
            "point": { x : point.y, y : point.z, z : point.x }
        });
    },

    //TODO: rename
    getGeometryFromLines: function() {
        var that = GCodeViewer;
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
    },

    showLines : function() {
        var that = GCodeViewer;
        var material = new THREE.LineBasicMaterial({ color : 0xffffff });
        var geometry = that.getGeometryFromLines();

        that.pathMesh = new THREE.Line(geometry, material);
        that.scene.add(that.pathMesh);
    },

    hideLines : function() {
        GCodeViewer.scene.remove(GCodeViewer.pathMesh);
    },

    setGCode: function(string) {
        GCodeViewer.gcode = string.split('\n');
    },

    createGrid : function() {
        var size = 10;
        var step = 1;

        var gridHelper = new THREE.GridHelper(size, step);
        return gridHelper;
    },

    //Returns a string if no command
    removeComments: function(command) {
        return command.split('(')[0].split(';')[0]; //No need to use regex
    },

    //TODO: do for more than a command by line
    parseGCode: function(command) {
        var obj = { type : "" };
        var that = GCodeViewer;
        var res;
        if(command === "") {
            return obj;
        }
        var com = that.removeComments(command);  //COMmand

        if(com === "") {
            return obj;
        }

        //TODO: do the same for all commands
        if(com.indexOf("G0") !== -1 || com.indexOf("G1") !== -1) {
            if(com.indexOf("G0") !== -1) {
                obj = { type: "G0" };
            } else {
                obj = { type: "G1" };
            }

            res = /X(-?\d+(\.\d*)?)/.exec(com);
            if(res !== null && res.length > 1) {
                obj.x = parseFloat(res[1], 10);
            }
            res = /Y(-?\d+(\.\d*)?)/.exec(com);
            if(res !== null && res.length > 1) {
                obj.y = parseFloat(res[1], 10);
            }
            res = /Z(-?\d+(\.\d*)?)/.exec(com);
            if(res !== null && res.length > 1) {
                obj.z = parseFloat(res[1], 10);
            }
        } else if(com.indexOf("G2") !== -1 || com.indexOf("G3") !== -1) {
            //NOTE: not implemented yet
            if(com.indexOf("G2") !== -1) {
                obj = { type: "G2" };
            } else {
                obj = { type: "G3" };
            }
        } else if(com.indexOf("G4") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G4" };
        } else if(com.indexOf("G20") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G20" };
        } else if(com.indexOf("G21") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G21" };
        } else if(com.indexOf("G90") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G90" };
        } else if(com.indexOf("G91") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "G91" };
        } else if(com.indexOf("M4") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "M4" };
        } else if(com.indexOf("M8") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "M8" };
        } else if(com.indexOf("M30") !== -1) {
            //NOTE: not implemented yet
            obj = { type: "M30" };
        }

        return obj;
    },

    viewGCode: function(code) {
        var that = GCodeViewer;
        var i = 0;
        var end = { x:0, y:0, z:0 };
        var result = {};
        that.setGCode(code);

        for(i=0; i < that.gcode.length; i++) {
            result = that.parseGCode(that.gcode[i]);
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
    },

    createSimpleBoard: function(width, length, height) {
        var that = GCodeViewer;
        var param = that.zUpToyUp({ x : width, y : length, z : height });
        var geometry = new THREE.BoxGeometry(param.x, param.y, param.z);
        var material = new THREE.MeshBasicMaterial({color: that.boardColor});
        var board = new THREE.Mesh(geometry, material);
        board.position.x = param.x / 2;
        board.position.y = param.y / 2;
        board.position.z = param.z / 2;
        return board;
    },

    // returns the object
    testCreateObject: function() {
        var californiaPts = [];

        californiaPts.push( new THREE.Vector2 ( 610, 320 ) );
        californiaPts.push( new THREE.Vector2 ( 450, 300 ) );
        californiaPts.push( new THREE.Vector2 ( 392, 392 ) );
        californiaPts.push( new THREE.Vector2 ( 266, 438 ) );
        californiaPts.push( new THREE.Vector2 ( 190, 570 ) );
        californiaPts.push( new THREE.Vector2 ( 190, 600 ) );
        californiaPts.push( new THREE.Vector2 ( 160, 620 ) );
        californiaPts.push( new THREE.Vector2 ( 160, 650 ) );
        californiaPts.push( new THREE.Vector2 ( 180, 640 ) );
        californiaPts.push( new THREE.Vector2 ( 165, 680 ) );
        californiaPts.push( new THREE.Vector2 ( 150, 670 ) );
        californiaPts.push( new THREE.Vector2 (  90, 737 ) );
        californiaPts.push( new THREE.Vector2 (  80, 795 ) );
        californiaPts.push( new THREE.Vector2 (  50, 835 ) );
        californiaPts.push( new THREE.Vector2 (  64, 870 ) );
        californiaPts.push( new THREE.Vector2 (  60, 945 ) );
        californiaPts.push( new THREE.Vector2 ( 300, 945 ) );
        californiaPts.push( new THREE.Vector2 ( 300, 743 ) );
        californiaPts.push( new THREE.Vector2 ( 600, 473 ) );
        californiaPts.push( new THREE.Vector2 ( 626, 425 ) );
        californiaPts.push( new THREE.Vector2 ( 600, 370 ) );
        californiaPts.push( new THREE.Vector2 ( 610, 320 ) );

        for( var i = 0; i < californiaPts.length; i ++ ) californiaPts[ i ].multiplyScalar( 0.25 );

        var californiaShape = new THREE.Shape( californiaPts );

        var extrudeSettings = { amount: 8, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };

        var geometry = new THREE.ExtrudeGeometry(californiaShape, extrudeSettings );
        var mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: 0xf08000 } ) );
        mesh.position.set(0, 0, 0);
        mesh.rotation.set(0, 0, 0);
        mesh.scale.set(1, 1, 1);
        console.log(mesh);
        return mesh;
    },

    test: function() {
        var that = GCodeViewer;

        // that.addStraightTo({x:0,y:0,z:-1});
        // that.addStraightTo({x:1,y:1,z:-1});
        // that.addStraightTo({x:1,y:1,z:2});
        // that.addStraightTo({x:0,y:0,z:2});
        // that.addStraightTo({x:0,y:0,z:0});
        // that.showLines();

        // that.scene.add(that.testCreateObject());
        GCodeViewer.board = that.createSimpleBoard(10, 5, 3);
        that.scene.add(GCodeViewer.board);
        that.scene.add(that.createGrid());

        that.render();
        that.animate();
    }
};

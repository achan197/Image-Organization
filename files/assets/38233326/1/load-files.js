var LoadFiles = pc.createScript('loadFiles');

// debug info
var NUM_TEST_FILES = 20;

// tools
var RAD_TO_DEG = 360 / (2 * Math.PI);


// grid dimensions
var GRID_RADIUS = 4;
// this.GRID_MAX_Y = 3;
// this.GRID_MIN_Y = -3;
// this.GRID_HEIGHT = this.GRID_MAX_Y - this.GRID_MIN_Y;

// assets
var IMAGE_ASSETS = null;
var STACK_FRAME_MATERIAL = null;
var HIGHLIGHT_MATERIAL_HORIZONTAL = null;
var HIGHLIGHT_MATERIAL_VERTICAL = null;
var STACK_COUNTER_FONT = null;

var NUM_FILES_CIRCUMFERENCE = 10;
var NUM_FILES_VERT = 4;

var HORIZ_SPACE_BETWEEN_FILES = 0.5;
var VERT_SPACE_BETWEEN_FILES = 0.5;

var GRID_CIRCUMFERENCE = 2 * Math.PI * GRID_RADIUS;
var WIDTH_FOR_FILE_AND_MARGIN = GRID_CIRCUMFERENCE / NUM_FILES_CIRCUMFERENCE;
var HEIGHT_FOR_FILE_AND_MARGIN = WIDTH_FOR_FILE_AND_MARGIN; // this.GRID_HEIGHT / this.NUM_FILES_VERT;

var HORIZ_FILE_MARGIN = 0.2 * WIDTH_FOR_FILE_AND_MARGIN; // 20% of horizontal space is margin
var VERT_FILE_MARGIN = 0.2 * HEIGHT_FOR_FILE_AND_MARGIN; // 20% of vertical space is margin
var MAX_FILE_WIDTH = 0.8 * WIDTH_FOR_FILE_AND_MARGIN;    // "max" width because either the height or width is stretched until its max, while the other is left smaller than its max
var MAX_FILE_HEIGHT = 0.8 * HEIGHT_FOR_FILE_AND_MARGIN;

var HORIZ_DEGREE_BETWEEN_FILES = 2 * Math.PI / NUM_FILES_CIRCUMFERENCE;

var HORIZ_BETWEEN_FILES_HIGHLIGHTING_WIDTH = 0.70 * HORIZ_FILE_MARGIN; // the highlighting cue when draggin a file between files
var HORIZ_BETWEEN_FILES_HIGHLIGHTING_HEIGHT = 0.95 * MAX_FILE_HEIGHT;

var VERT_BETWEEN_FILES_HIGHLIGHTING_WIDTH = 0.95 * MAX_FILE_WIDTH; // the highlighting cue when draggin a file between files
var VERT_BETWEEN_FILES_HIGHLIGHTING_HEIGHT = 0.70 * VERT_FILE_MARGIN;

var HORIZ_BETWEEN_FILES_HIGHLIGHTING_COLLIDER_WIDTH = 0.70 * HORIZ_FILE_MARGIN; // the highlighting cue when draggin a file between files
var HORIZ_BETWEEN_FILES_HIGHLIGHTING_COLLIDER_HEIGHT = 0.95 * MAX_FILE_HEIGHT;

var VERT_BETWEEN_FILES_HIGHLIGHTING_COLLIDER_WIDTH = 0.95 * MAX_FILE_WIDTH; // the highlighting cue when draggin a file between files
var VERT_BETWEEN_FILES_HIGHLIGHTING_COLLIDER_HEIGHT = 0.70 * VERT_FILE_MARGIN;


var gridVertOffset = 0;  // use this to "scroll" vertically (not used yet)
var gridHorizOffset = 0; // use these to "scroll" through the grid (if the player prefers this over rotating her/his body)
var GRID_HORIZ_SCROLL_MULTIPLIER = 1/10; // no idea what to set this to. maybe just based on what feels good

var MAX_RING_Y = (NUM_FILES_VERT / 2.0) * HEIGHT_FOR_FILE_AND_MARGIN; // + this.HEIGHT_FOR_FILE_AND_MARGIN / 2.0;
var MIN_RING_Y = -MAX_RING_Y;
var GRID_HEIGHT = MAX_RING_Y - MIN_RING_Y;

var GAZE_RAY_LENGTH = Math.max(GRID_HEIGHT / 4.0, GRID_RADIUS);

var MAX_ZOOM_DISTANCE = 12;
var ZOOM_BASE = 1.7;
var ZOOM_BASE_MULT = 1.6;
var MIN_ZOOM_MULT = 0.3;

var rings = [];

var tempStackGrid = [];
var tempStackRings = [];

var mainGrid;

var curGrid;

// initialize code called once per entity
LoadFiles.prototype.initialize = function() {
        
    this.gridEntity = this.app.root.findByName("GridEntity");    
    this.gridAxis = this.gridEntity.findByName("GridAxis");
    
    // cylinder for detecting gaze
    this.gridCollisionCylinder = new pc.Entity("GridCollisionCylinder");
    this.gridCollisionCylinder.addComponent("model", {
        type: "cylinder",
    });
    
    this.gridCollisionCylinder.addComponent("collision", {
        type: "cylinder",
        radius: GRID_RADIUS,
        height: GRID_HEIGHT
    });
        

    this.gridCollisionCylinder.model.meshInstances[0].material = new pc.StandardMaterial(); // TODO: figure out why the collision itself is triangular during raycasting. Either increase granularity or simular curvature with many pieces?
    this.gridCollisionCylinder.model.meshInstances[0].material.cull = pc.CULLFACE_FRONTANDBACK; // make it invisible (coloring is for debug purposes)
    // this.gridCollisionCylinder.model.meshInstances[0].material.ambient.set(curColor.r/255, curColor.g/255, curColor.b/255);
    // this.gridCollisionCylinder.model.meshInstances[0].material.diffuse.set(curColor.r/255, curColor.g/255, curColor.b/255);
    // this.gridCollisionCylinder.model.meshInstances[0].material.specular.set(curColor.r/255, curColor.g/255, curColor.b/255);
    
    this.gridCollisionCylinder.model.meshInstances[0].material.update();
    
    this.gridAxis.addChild(this.gridCollisionCylinder);
    this.gridCollisionCylinder.setLocalScale(GRID_RADIUS / 0.5, GRID_HEIGHT, GRID_RADIUS / 0.5); // 0.5 is default radius, 1.0 is default height
    
    // gaze
    this.cameraEntity = this.app.root.findByName("Camera");
    this.gazeHoverEntity = null;
    this.gazeHoverPoint = new pc.Vec3();
    this.gazeVecA = new pc.Vec3();
    this.gazeVecB = new pc.Vec3();
    
    this.previous = undefined; // previously gaze-selected file
    this.highlightObj = null;
    this.grabbedEntity = null;
    
    this.zoomActive = true;
    this.isStackableLeft = false;
    this.isStackableRight = false;
    this.isStackable = [false, false];
    
    this.focusedFile = null;
    this.closestFile = null;
    this.grabbing = false;
    this.canReposition = false;
    this.displayingStack = false;
    this.displayedStack = null;
    
    // set up some events/triggers/whatever these are called
    this.on('hover', this.onHover, this);
    this.on('updateZoom', this.updateZoom, this);
    this.app.on('deactivatezoom', this.deactivateZoom, this);
    this.app.on('activatezoom', this.activateZoom, this);
    this.app.on('checkcanstack', this.checkCanStack, this);
    this.app.on('stack', this.stack,  this);
    this.app.on('handlecontrollerrelease', this.handleControllerRelease, this);
    this.app.on('rearrangefiles', this.rearrangeFiles, this);
    this.app.on('activatehighlight', this.activateHighlight, this);
    this.app.on('deactivatehighlight', this.deactivateHighlight, this);
    this.app.on('reposition', this.reposition, this);
    this.app.on('updatescroll', this.updateScroll, this);
    this.app.on('displaystack', this.displayStack, this);
    this.app.on('showmaingrid', this.showMainGrid, this);
    this.app.on('hidemaingrid', this.hideMainGrid, this);
    this.app.on('stopdisplayingstack', this.stopDisplayingStack, this);
    
    var self = this;
    IMAGE_ASSETS = this.app.assets.findByTag("image");
    STACK_FRAME_MATERIAL = this.app.assets.findByTag("StackFrameMaterial")[0];
    HIGHLIGHT_MATERIAL_HORIZONTAL = this.app.assets.findByTag("HighlightMaterialHorizontal")[0];
    HIGHLIGHT_MATERIAL_VERTICAL = this.app.assets.findByTag("HighlightMaterialVertical")[0];
    
    this.selectHighlightObject = null;
    // Load a font
    STACK_COUNTER_FONT = this.app.assets.get(38233344);

    this.app.assets.add(STACK_COUNTER_FONT);
    this.app.assets.load(STACK_COUNTER_FONT);
    
    // sounds
    var tick = this.app.assets.get(38305247);

    this.app.root.addComponent("sound");

    this.app.root.sound.addSlot('tick', {
        loop: false,
        autoPlay: false,
        asset: tick
    });

    this.app.root.sound.positional = true;
    
    var pop = this.app.assets.get(38306341);

    this.app.root.sound.addSlot('pop', {
        loop: false,
        autoPlay: false,
        asset: pop
    });
    
    var shuffle = this.app.assets.get(38306598);

    this.app.root.sound.addSlot('shuffle', {
        loop: false,
        autoPlay: false,
        asset: shuffle
    });
    
    var numRows = Math.ceil(IMAGE_ASSETS.length / NUM_FILES_CIRCUMFERENCE);
    
    mainGrid = [];
    for (var j = 0; j < numRows; j++) {
        mainGrid.push([]);
        for (var i = 0; i < NUM_FILES_CIRCUMFERENCE; i++) {
            var obj = {};
            mainGrid[j].push(obj);
        }
    }
    
    var imagesLeft = IMAGE_ASSETS.length;
    for (var row = 0; row < mainGrid.length; row++) {
        var ring = makeRing(row);
        this.gridAxis.addChild(ring);
        for (var col = 0; col < mainGrid[row].length; col++) {
            if (imagesLeft > 0) {
                mainGrid[row][col].hasFile = true;
                
                
                mainGrid[row][col].file = makeFile(col, row);
                mainGrid[row][col].file.isStack = false;
                
                ring.addChild(mainGrid[row][col].file);
                // mainGrid[row][col].theta = col * HORIZ_DEGREE_BETWEEN_FILES;

                var lScale = mainGrid[row][col].file.getLocalScale();  
                mainGrid[row][col].file.w = lScale.x;
                mainGrid[row][col].file.h = lScale.z;
                
                imagesLeft -= 1;
                
                mainGrid[row][col].horizHighlightObj = makeHighlightingObjectBetweenFiles(col, row);
                ring.addChild(mainGrid[row][col].horizHighlightObj);
                
                mainGrid[row][col].vertHighlightObj = makeHighlightingObjectBetweenFilesVertical(col, row);
                ring.addChild(mainGrid[row][col].vertHighlightObj);
            }
        }
        rings.push(ring);
    }
    curGrid = mainGrid;
    this.app.fire('object:reload');
};

var getImageDimensions = function(col, row) {
    dims = {};
    // debug -- supply random values
    // dims.width = 2 + 1; //Math.random(3);
    // dims.height = 2 + 1;  //Math.random(3);
    dims.width = IMAGE_ASSETS[NUM_FILES_CIRCUMFERENCE * row + col].resource.width;
    dims.height = IMAGE_ASSETS[NUM_FILES_CIRCUMFERENCE * row + col].resource.height;
    return dims;
};

var makeRing = function(j) {
    var ring = new pc.Entity("ring " + j);
    var posY = MIN_RING_Y + j * HEIGHT_FOR_FILE_AND_MARGIN + VERT_FILE_MARGIN / 2.0;
    ring.setLocalPosition(0, posY, 0);
    return ring;
};

var makeFile = function(i, j) {
    var filePlane = new pc.Entity(i + "," + j);
    filePlane.addComponent("model", {
        type: "plane",
    });
    filePlane.col = i;
    filePlane.row = j;

    ////////// add color for debug //////
    filePlane.model.meshInstances[0].material = new pc.StandardMaterial();
    filePlane.model.meshInstances[0].material.diffuseMap = IMAGE_ASSETS[NUM_FILES_CIRCUMFERENCE * j + i].resource;
    filePlane.model.meshInstances[0].material.update();

    // calculate width and height
    // normally, we check here for the dimensions of the actual image
    var w = 0;
    var h = 0;
    var imageDims = getImageDimensions(i, j);

    var wOverH = imageDims.width/imageDims.height;
    if (imageDims.width > imageDims.height) {
        w = MAX_FILE_WIDTH;
        h = w / wOverH;
    }
    else {
        h = MAX_FILE_HEIGHT;
        w = h * wOverH;
    }

    filePlane.setLocalScale(w, 1, h);
    //GRID_RADIUS * ((Math.abs(j - rings.length / 2.0) + 5) / (5 + rings.length / 2))

    // calculate position and rotation
    var posY = 0; // 0 relative to its parent, a ring object
    var theta = i * HORIZ_DEGREE_BETWEEN_FILES;
    var posX = GRID_RADIUS * Math.sin(theta);
    var posZ = GRID_RADIUS * Math.cos(theta);

    theta = RAD_TO_DEG * theta;

    filePlane.setLocalPosition(posX, posY, posZ); 
    filePlane.setLocalEulerAngles(90, theta + 180, 0);


    filePlane.tags.add("image");
    filePlane.tags.add("file");
    filePlane.tags.add("pickable");

    // add collider
    filePlane.addComponent("collision", {
        type: "box",
        halfExtents: new pc.Vec3(w / 2, 0.04, h / 2)
    });
    return filePlane;
};

var makeHighlightingObjectBetweenFiles = function(i, j) {
    var highlightObj = new pc.Entity("HighlightObject," + i + "," + j + ",horiz");
    highlightObj.addComponent("model", {
        type: "plane",
    });

    highlightObj.vert = false;
    highlightObj.horiz = true;

    highlightObj.col = i;
    highlightObj.row = j;

    highlightObj.model.meshInstances[0].material = HIGHLIGHT_MATERIAL_VERTICAL.resource;

    highlightObj.model.enabled = false;
    highlightObj.model.meshInstances[0].material.update();

    highlightObj.setLocalScale(HORIZ_BETWEEN_FILES_HIGHLIGHTING_WIDTH, 1, HORIZ_BETWEEN_FILES_HIGHLIGHTING_HEIGHT);

    // add collider
    highlightObj.addComponent("collision", {
        type: "box",
        halfExtents: new pc.Vec3(HORIZ_BETWEEN_FILES_HIGHLIGHTING_COLLIDER_WIDTH / 2, 0.04, HORIZ_BETWEEN_FILES_HIGHLIGHTING_COLLIDER_HEIGHT / 2)
    });

    // calculate position and rotation
    var posY = 0; // 0 relative to its parent, a ring object
    var theta = (i + 0.5) * HORIZ_DEGREE_BETWEEN_FILES; // the 0.5 is to put these halfway in between files
    var posX = GRID_RADIUS * Math.sin(theta);
    var posZ = GRID_RADIUS * Math.cos(theta);

    theta = RAD_TO_DEG * theta;

    highlightObj.setLocalPosition(posX, posY, posZ); 
    highlightObj.setLocalEulerAngles(90, theta + 180, 0);

    return highlightObj;
};

var makeHighlightingObjectBetweenFilesVertical = function(i, j) {
    var highlightObj = new pc.Entity("HighlightObject," + i + "," + j + ",vert");
    highlightObj.addComponent("model", {
        type: "plane",
    });

    highlightObj.vert = true;
    highlightObj.horiz = false;

    highlightObj.col = i;
    highlightObj.row = j;

    highlightObj.model.meshInstances[0].material = HIGHLIGHT_MATERIAL_HORIZONTAL.resource;

    highlightObj.model.enabled = false;
    highlightObj.model.meshInstances[0].material.update();

    highlightObj.setLocalScale(VERT_BETWEEN_FILES_HIGHLIGHTING_WIDTH, 1, VERT_BETWEEN_FILES_HIGHLIGHTING_HEIGHT);
    // add collider
    highlightObj.addComponent("collision", {
        type: "box",
        halfExtents: new pc.Vec3(VERT_BETWEEN_FILES_HIGHLIGHTING_COLLIDER_WIDTH / 2, 0.04, VERT_BETWEEN_FILES_HIGHLIGHTING_COLLIDER_HEIGHT / 2)
    });

    // calculate position and rotation
    var posY = HEIGHT_FOR_FILE_AND_MARGIN / 2.0; // relative to its parent, a ring object
    var theta = i * HORIZ_DEGREE_BETWEEN_FILES; // the 0.5 is to put these halfway in between files
    var posX = GRID_RADIUS * Math.sin(theta);
    var posZ = GRID_RADIUS * Math.cos(theta);

    theta = RAD_TO_DEG * theta;

    highlightObj.setLocalPosition(posX, posY, posZ); 
    highlightObj.setLocalEulerAngles(90, theta + 180, 0);

    return highlightObj;
};

var getFilePos = function(col, row) {
    
        // var gridRotation = 360.0 * (gridHorizOffset / GRID_HORIZ_SCROLL_MULTIPLIER);
        
        // calculate position and rotation
        var posY = 0; // 0 relative to its parent, a ring object
        var theta = col * HORIZ_DEGREE_BETWEEN_FILES;
        var posX = GRID_RADIUS * Math.sin(theta);
        var posZ = GRID_RADIUS * Math.cos(theta);
        theta = RAD_TO_DEG * theta;
        return [posX, posY, posZ, theta];
};

var getFilePosRadius = function(col, row, radius) {
        // var gridRotation = 360.0 * (gridHorizOffset / GRID_HORIZ_SCROLL_MULTIPLIER);
        
        // calculate position and rotation
        var posY = 0; // 0 relative to its parent, a ring object
        var theta = col * HORIZ_DEGREE_BETWEEN_FILES;
        var posX = radius * Math.sin(theta);
        var posZ = radius * Math.cos(theta);
        theta = RAD_TO_DEG * theta;
        return [posX, posY, posZ, theta];
};

var createStackEntity = function(col, row, stackFiles) {
    var stackEntity = new pc.Entity(col + "," + row);
        stackEntity.addComponent("model", {
            type: "plane",
        });
    
    stackEntity.col = col;
    stackEntity.row = row;
    
    mainGrid[row][col].hasFile = true;
    
    stackEntity.model.meshInstances[0].material = STACK_FRAME_MATERIAL.resource;
    stackEntity.model.meshInstances[0].material.update();
    
    
    stackEntity.setLocalScale(MAX_FILE_WIDTH, 1, MAX_FILE_HEIGHT);
    rings[row].addChild(stackEntity);
    
    // get position and rotation at (col, row)
    var filePos = getFilePos(col, row);
    var posY = filePos[1]; // 0 relative to its parent, a ring object
    var theta = filePos[3];
    var posX = filePos[0];
    var posZ = filePos[2];
    
    stackEntity.setLocalPosition(posX, posY, posZ); 
    stackEntity.setLocalEulerAngles(90, theta + 180, 0);
    
    var numRows = 3;
    var numCols = 3;
    var WIDTH_FOR_FILE_AND_MARGIN_THUMBNAIL = MAX_FILE_WIDTH / numCols;
    var HEIGHT_FOR_FILE_AND_MARGIN_THUMBNAIL = MAX_FILE_HEIGHT / numRows;
    var thumbnailIconWidth = 0.3 * WIDTH_FOR_FILE_AND_MARGIN_THUMBNAIL;
    var thumbnailIconHeight = 0.3 * HEIGHT_FOR_FILE_AND_MARGIN_THUMBNAIL;
    
    for (var idx = 0; idx < Math.min(9, stackFiles.length); idx++) {
        var c = idx % numCols;
        var r = Math.floor(idx / numRows);
        stackFiles[idx].reparent(stackEntity);
        
        var w = 0;
        var h = 0;
        var wOverH = stackFiles[idx].w/stackFiles[idx].h;
        if (stackFiles[idx].w > stackFiles[idx].h) {
            w = thumbnailIconWidth;
            h = w / wOverH;
        }
        else {
            h = thumbnailIconHeight;
            w = h * wOverH;
        }
        
        stackFiles[idx].setLocalScale(w, 1, h);
        stackFiles[idx].setLocalPosition(0.02 + thumbnailIconWidth / 2.0 + (thumbnailIconWidth + 0.02) * c - 1 / 3.0, 0.1, 0.02 + thumbnailIconHeight / 2.0 + (thumbnailIconHeight + 0.02) * r - 1 / 3.0);
        stackFiles[idx].setLocalEulerAngles(0, 0, 0);
    }
    
    var scrn = new pc.Entity("scrn");
    stackEntity.addChild(scrn);
    scrn.setLocalEulerAngles(-90, 0, 0);
    scrn.setLocalPosition(0.2 * MAX_FILE_WIDTH, 0.1, 0.2 * MAX_FILE_HEIGHT);
    
    scrn.addComponent("element", {
        type: pc.ELEMENTTYPE_TEXT,
        anchor: [0.5, 0.5, 0.5, 0.5],
        pivot: [0.5, 0.5],
        autoWidth: true,
        fontSize: 0.075,
        text: stackFiles.length.toString(),
        fontAsset: STACK_COUNTER_FONT,
        opacity: 0.7
    });
    
    if (stackFiles.length > 9) {
        // add visual cue that there are more than 9 files in the stack
        // actually, might as well add some text saying the exact number, huh...
        // create object in top-right of stackEntity with number
        
        for (var i = 9; i < stackFiles.length; i++) {
            stackFiles[i].reparent(stackEntity);
            stackFiles[i].model.enabled = false; // just make them invisible. then it doesn't matter where they are. right..?
        }
    }

    
    stackEntity.tags.add("pickable");
    
    // add collider
    stackEntity.addComponent("collision", {
        type: "box",
        halfExtents: new pc.Vec3(MAX_FILE_WIDTH / 2, 0.04, MAX_FILE_HEIGHT / 2)
    });
    
    return stackEntity;
};

var setMainGridFilesPickable = function() {
    for (var r = 0; r < mainGrid.length; r++) {
        for (var c = 0; c < mainGrid[r].length; c++) {
            if (mainGrid[r][c].file !== null) {mainGrid[r][c].hasFile = true;} else {mainGrid[r][c].hasFile = false;}
            if (mainGrid[r][c].hasFile) {
                mainGrid[r][c].file.tags.add("pickable");
            }
        }
    }
};

var setTempGridFilesPickable = function() {
    if (tempStackGrid) {
        for (var r = 0; r < tempStackGrid.length; r++) {
            for (var c = 0; c < tempStackGrid[r].length; c++) {
                if (tempStackGrid[r][c].file) {
                    tempStackGrid[r][c].hasFile = true;
                    if (tempStackGrid[r][c].hasFile) {
                        tempStackGrid[r][c].file.tags.add("pickable");
                    }
                } else {
                    tempStackGrid[r][c].hasFile = false;
                }
            }
        }
    }
};

var setTempGridFilesUnpickable = function() {
    if (tempStackGrid) {
        for (var r = 0; r < tempStackGrid.length; r++) {
            for (var c = 0; c < tempStackGrid[r].length; c++) {
                if (tempStackGrid[r][c].file) {
                    tempStackGrid[r][c].hasFile = true;
                    if (tempStackGrid[r][c].hasFile) {
                        tempStackGrid[r][c].file.tags.remove("pickable");
                    }
                }
            }
        }
    }
};

LoadFiles.prototype.handleControllerRelease = function(releasedEntity, handedness) {

    if (releasedEntity) {
        if (this.isStackable[handedness] && this.focusedFile) {
            // make stack
            // set stack information
            var displacedCol = releasedEntity.col;
            var displacedRow = releasedEntity.row;
            mainGrid[displacedRow][displacedCol].hasFile = false;

            var stackCol = this.focusedFile.col;
            var stackRow = this.focusedFile.row;
            
            var alreadyStack = mainGrid[stackRow][stackCol].file.isStack;
            var stackFiles;
            if (!mainGrid[stackRow][stackCol].file.isStack) {
                stackFiles = [];
                stackFiles.push(this.focusedFile);
            }
            else {
                stackFiles = mainGrid[stackRow][stackCol].file.stackFiles;
                oldStack = mainGrid[stackRow][stackCol].file;
            }
            stackFiles.push(releasedEntity);

            mainGrid[stackRow][stackCol].file = createStackEntity(stackCol, stackRow, stackFiles);
            mainGrid[stackRow][stackCol].file.stackFiles = stackFiles;
            mainGrid[stackRow][stackCol].file.isStack = true;
            
            if (alreadyStack) {
                oldStack.destroy();
            }

            // move files to take place of stacked file if not displaying stack
            if (!this.displayingStack) {
                this.app.fire('rearrangefiles', displacedCol, displacedRow);
            }
            
            releasedEntity.tags.remove("pickable");
            this.focusedFile.tags.remove("pickable");
            
            if (this.displayingStack) {

                // update stack information
                for( var i = 0; i < this.displayedStack.stackFiles.length; i++)
                { 
                    if (this.displayedStack.stackFiles[i].name == releasedEntity.name) {
                        this.displayedStack.stackFiles.splice(i, 1);
                    }
                }
                
                            
                var oldStack = mainGrid[this.displayedStack.row][this.displayedStack.col].file;
                if (this.displayedStack.stackFiles.length > 1) {
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file = createStackEntity(this.displayedStack.col, this.displayedStack.row, this.displayedStack.stackFiles);
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.stackFiles = this.displayedStack.stackFiles;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.isStack = true;
                    
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.row = this.displayedStack.row;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.col = this.displayedStack.col;
                    
                    var filePos = getFilePos(this.displayedStack.col, this.displayedStack.row);
                    var posY = filePos[1]; // 0 relative to its parent, a ring object
                    var theta = filePos[3];
                    var posX = filePos[0];
                    var posZ = filePos[2];
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalPosition(posX, 0, posZ);
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalEulerAngles(90, theta + 180, 0);
                    
                    releasedEntity.tags.remove("pickable");
                    this.focusedFile.tags.remove("pickable");
                } else {
                    mainGrid[this.displayedStack.row][this.displayedStack.col].hasFile = true;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file = this.displayedStack.stackFiles[0];
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.isStack = false;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.row = this.displayedStack.row;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.col = this.displayedStack.col;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.reparent(rings[this.displayedStack.row]);
                    
                    var filePos = getFilePos(this.displayedStack.col, this.displayedStack.row);
                    var posY = filePos[1]; // 0 relative to its parent, a ring object
                    var theta = filePos[3];
                    var posX = filePos[0];
                    var posZ = filePos[2];
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalPosition(posX, 0, posZ);
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalEulerAngles(90, theta + 180, 0);
            
                }
                
                oldStack.destroy();
                this.displayingStack = false;
                
                this.app.fire('setdisplayingstack', false);
                this.displayedStack = null;
                curGrid = mainGrid;
                gridVertOffset = 0; // if we had scrolling implemented, we would set this to oldGridVertOffset, not 0
                gridHorizOffset = 0;
                
                setTempGridFilesUnpickable();
                setMainGridFilesPickable();
            }
            
            
            this.app.fire('object:reload');
            
        } else if (this.canReposition) {
            if (this.displayingStack) {
                var emptyRow;
                var emptyCol;
                
                emptyRow = rings.length - 1;
                emptyCol = NUM_FILES_CIRCUMFERENCE - 1;
                releasedEntity.row = emptyRow;
                releasedEntity.col = emptyCol;
                var filePos = getFilePos(emptyCol, emptyRow);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];
                mainGrid[emptyRow][emptyCol].file = releasedEntity;
                mainGrid[emptyRow][emptyCol].file.reparent(rings[emptyRow]);
                // mainGrid[emptyRow][emptyCol].file.setLocalPosition(posX, 0, posZ);
                mainGrid[emptyRow][emptyCol].file.tween(mainGrid[emptyRow][emptyCol].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.7, pc.SineOut).start();
                mainGrid[emptyRow][emptyCol].file.tween(mainGrid[emptyRow][emptyCol].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.7, pc.SineOut).start();
                // mainGrid[emptyRow][emptyCol].file.setLocalEulerAngles(90, theta + 180, 0);
            
                // put this into function?
                for (var r = 0; r < mainGrid.length; r++) {
                    for (var c = 0; c < mainGrid[r] .length; c++) {
                        if (mainGrid[r][c].hasFile) {
                            mainGrid[r][c].file.tags.add("pickable");
                        }
                    }
                }

                // update stack information
                for( var i = 0; i < this.displayedStack.stackFiles.length; i++)
                { 
                    if (this.displayedStack.stackFiles[i].name == releasedEntity.name) {
                        this.displayedStack.stackFiles.splice(i, 1);
                    }
                }
                            
                var oldStack = mainGrid[this.displayedStack.row][this.displayedStack.col].file;
                if (this.displayedStack.stackFiles.length > 1) {
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file = createStackEntity(this.displayedStack.col, this.displayedStack.row, this.displayedStack.stackFiles);
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.stackFiles = this.displayedStack.stackFiles;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.isStack = true;
                    
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.row = this.displayedStack.row;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.col = this.displayedStack.col;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.reparent(rings[this.displayedStack.row]);
                    
                    var filePos = getFilePos(this.displayedStack.col, this.displayedStack.row);
                    var posY = filePos[1]; // 0 relative to its parent, a ring object
                    var theta = filePos[3];
                    var posX = filePos[0];
                    var posZ = filePos[2];
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalPosition(posX, 0, posZ);
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalEulerAngles(90, theta + 180, 0);
                } else {
                    mainGrid[this.displayedStack.row][this.displayedStack.col].hasFile = true;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file = this.displayedStack.stackFiles[0];
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.isStack = false;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.row = this.displayedStack.row;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.col = this.displayedStack.col;
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.reparent(rings[this.displayedStack.row]);
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.tags.add("pickable");
                    
                    
                    var filePos = getFilePos(this.displayedStack.col, this.displayedStack.row);
                    var posY = filePos[1]; // 0 relative to its parent, a ring object
                    var theta = filePos[3];
                    var posX = filePos[0];
                    var posZ = filePos[2];
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalPosition(posX, 0, posZ);
                    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalEulerAngles(90, theta + 180, 0);
            
                }
                
                releasedEntity.tags.add("pickable");
                
                oldStack.destroy();
                this.app.fire('setdisplayingstack', false);
                this.displayingStack = false;
                this.displayedStack = null;
                curGrid = mainGrid;
                gridVertOffset = 0; // if we had scrolling implemented, we would set this to oldGridVertOffset, not 0
                gridHorizOffset = 0;

                // add new ring if not enough space
                if (rings[rings.length - 1].children.length == NUM_FILES_CIRCUMFERENCE + 1) {
                    var newRing = makeRing(rings.length);
                    rings.push(newRing);
                }
                
                this.app.fire('reposition', releasedEntity);
            } else {
                this.app.fire('reposition', releasedEntity);
            }
            
            
        }
        else {
            // reset position of grabbed file ("snap" back)
            var col;
            var row;
            
            if (this.displayingStack) {
                col = releasedEntity.colInStack;
                row = releasedEntity.rowInStack;
                this.app.fire('hidemaingrid');                
            }
            else {
                col = releasedEntity.col;
                row = releasedEntity.row;
            }

            // get position and rotation at (col, row)
            var filePos = getFilePos(col, row);
            var posY = filePos[1]; // 0 relative to its parent, a ring object
            var theta = filePos[3];
            var posX = filePos[0];
            var posZ = filePos[2];

            // could animate it back into place, but just snap it back for now
            this.app.root.sound.play('pop');
            
            curGrid[row][col].file.tween(curGrid[row][col].file.getLocalPosition()).to({x: posX, y: posY, z: posZ}, 0.7, pc.SineOut).start();
            // curGrid[row][col].file.tween(curGrid[row][col].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.7, pc.SineOut).start();
            curGrid[row][col].file.setLocalEulerAngles(90, theta + 180, 0);
            
        }
        this.focusedFile = null;
        this.canReposition = false;
    }
};

LoadFiles.prototype.stopDisplayingStack = function() {
    gridVertOffset = 0; // if we had scrolling implemented, we would set this to oldGridVertOffset, not 0
    gridHorizOffset = 0;
    
    // pull main grid images to foreground
    for (var j = 0; j < mainGrid.length; j++) {
        for (var i = 0; i < mainGrid[j].length; i++) {
            if (mainGrid[j][i].hasFile) {
                var filePos = getFilePosRadius(i, j, GRID_RADIUS);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];
                
                
                // calculate approximate zoom it'll be by the time it comes back
                var dist = Math.abs(((new pc.Vec3(posX, MIN_RING_Y + j * HEIGHT_FOR_FILE_AND_MARGIN + VERT_FILE_MARGIN / 2.0, posZ)).distance(this.gazeHoverPoint)));
                dist = Math.min(dist, MAX_ZOOM_DISTANCE);
                var theta2 = (-Math.PI) * (dist / MAX_ZOOM_DISTANCE);
                var mult = ZOOM_BASE_MULT * Math.sin(theta2) + ZOOM_BASE;
                mult = Math.max(MIN_ZOOM_MULT, mult);
                
                mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalScale()).to({x: mult * mainGrid[j][i].file.w, y: 1, z: mult * mainGrid[j][i].file.h}, 0.3, pc.SineOut).start();
                
                mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.3, pc.SineOut).start();
                mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.3, pc.SineOut).start();

                mainGrid[j][i].horizHighlightObj.enabled = true;
                mainGrid[j][i].vertHighlightObj.enabled = true;
            }
        }
    }
    
    mainGrid[this.displayedStack.row][this.displayedStack.col].file = createStackEntity(this.displayedStack.col, this.displayedStack.row, this.displayedStack.stackFiles);
    mainGrid[this.displayedStack.row][this.displayedStack.col].file.stackFiles = this.displayedStack.stackFiles;
    mainGrid[this.displayedStack.row][this.displayedStack.col].file.isStack = true;

    mainGrid[this.displayedStack.row][this.displayedStack.col].file.row = this.displayedStack.row;
    mainGrid[this.displayedStack.row][this.displayedStack.col].file.col = this.displayedStack.col;
    mainGrid[this.displayedStack.row][this.displayedStack.col].file.reparent(rings[this.displayedStack.row]);

    var filePos = getFilePos(this.displayedStack.col, this.displayedStack.row);
    var posY = filePos[1]; // 0 relative to its parent, a ring object
    var theta = filePos[3];
    var posX = filePos[0];
    var posZ = filePos[2];
    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalPosition(posX, 0, posZ);
    mainGrid[this.displayedStack.row][this.displayedStack.col].file.setLocalEulerAngles(90, theta + 180, 0);
    
    setTempGridFilesUnpickable();
    setMainGridFilesPickable();
    
    this.app.fire('setdisplayingstack', false);
    this.displayingStack = false;
    this.displayedStack = null;
    curGrid = mainGrid;
    
};

LoadFiles.prototype.showMainGrid = function() {
    // temporarily reset the scrolls to what they were before (just 0 for now)
    gridVertOffset = 0; // if we had scrolling implemented, we would set this to oldGridVertOffset, not 0
    gridHorizOffset = 0;
    
    // pull main grid images to foreground
    for (var j = 0; j < mainGrid.length; j++) {
        for (var i = 0; i < mainGrid[j].length; i++) {
            if (mainGrid[j][i].hasFile) {
                var filePos = getFilePosRadius(i, j, GRID_RADIUS);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];
                mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.2, pc.SineOut).start();
                mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.2, pc.SineOut).start();
                mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalScale()).to({x: mainGrid[j][i].file.w, y: 1, z: mainGrid[j][i].file.h}, 0.2, pc.SineOut).start();
                
                mainGrid[j][i].horizHighlightObj.enabled = true;
                mainGrid[j][i].vertHighlightObj.enabled = true;
            }
        }
    }
    
    // push stack grid images to background
    for (var j = 0; j < tempStackGrid.length; j++) {
        for (var i = 0; i < tempStackGrid[j].length; i++) {
            if (tempStackGrid[j][i].hasFile) {
                if (tempStackGrid[j][i].file.name != this.grabbedEntity.name) {
                    var filePos = getFilePosRadius(i, j, 2 * GRID_RADIUS);
                    var posY = filePos[1]; // 0 relative to its parent, a ring object
                    var theta = filePos[3];
                    var posX = filePos[0];
                    var posZ = filePos[2];
                    tempStackGrid[j][i].file.tween(tempStackGrid[j][i].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.2, pc.SineOut).start();
                    tempStackGrid[j][i].file.tween(tempStackGrid[j][i].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.2, pc.SineOut).start();
                    tempStackGrid[j][i].file.tween(tempStackGrid[j][i].file.getLocalScale()).to({x: tempStackGrid[j][i].file.w, y: 1, z: tempStackGrid[j][i].file.h}, 0.2, pc.SineOut).start();
                    tempStackGrid[j][i].file.tags.remove("pickable");
                }
            }

        }
    }
};

var setTempGridScroll = function() {
    // set vertical scrolling to center temp grid rows
    gridVertOffset = (GRID_HEIGHT / 2) - (tempStackRings.length / 2.0) * HEIGHT_FOR_FILE_AND_MARGIN;
    if (tempStackRings.length == 1) {
        var lastIdx = 0;
        for (var idx = 0; idx < tempStackGrid[0].length; idx++) {
            if (tempStackGrid[0][idx].hasFile) {
                lastIdx = idx;
            }
        }
        // center stack contents around stackEntity.col
        var middleIdx = (0 + lastIdx) / 2;
        var dt = HORIZ_DEGREE_BETWEEN_FILES * middleIdx + 180;
        gridHorizOffset = dt / 360;
    }
};

LoadFiles.prototype.hideMainGrid = function() {
    // bring scrolls back to temp grid values
    setTempGridScroll();
    
    // push main grid images to background
    for (var j = 0; j < mainGrid.length; j++) {
        for (var i = 0; i < mainGrid[j].length; i++) {
            if (mainGrid[j][i].hasFile) {
                var filePos = getFilePosRadius(i, j, 2 * GRID_RADIUS);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];
                // mainGrid[j][i].file.setLocalPosition(posX, 0, posZ);
                mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.3, pc.SineOut).start();
                mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.3, pc.SineOut).start();
                mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalScale()).to({x: mainGrid[j][i].file.w, y: 0.3, z: mainGrid[j][i].file.h}, 0.3, pc.SineOut).start();
                // mainGrid[j][i].file.setLocalEulerAngles(90, theta + 180, 0);
                // mainGrid[j][i].file.setLocalScale(mainGrid[j][i].file.w, 1, mainGrid[j][i].file.h);
                mainGrid[j][i].file.tags.remove("pickable");
                
                mainGrid[j][i].horizHighlightObj.enabled = false;
                mainGrid[j][i].vertHighlightObj.enabled = false;
            }
        }
    }
    
    // pull stack grid images to foreground
    for (var j = 0; j < tempStackGrid.length; j++) {
        for (var i = 0; i < tempStackGrid[j].length; i++) {
            if (tempStackGrid[j][i].hasFile) {
                if (this.grabbedEntity && tempStackGrid[j][i].file.name == this.grabbedEntity.name) {
                    break;
                }
                var filePos = getFilePosRadius(i, j, GRID_RADIUS);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];
                tempStackGrid[j][i].file.tween(tempStackGrid[j][i].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.3, pc.SineOut).start();
                tempStackGrid[j][i].file.tween(tempStackGrid[j][i].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.3, pc.SineOut).start();
                tempStackGrid[j][i].file.tween(tempStackGrid[j][i].file.getLocalScale()).to({x: tempStackGrid[j][i].file.w, y: 0.3, z: tempStackGrid[j][i].file.h}, 0.7, pc.SineOut).start();
                tempStackGrid[j][i].file.tags.add("pickable");
            }
        }
    }
    setTempGridFilesPickable();
};

LoadFiles.prototype.activateHighlight = function(highlightObj) {
    if (this.grabbing && this.highlightObj === null) {
        var col = highlightObj.col;
        var row = highlightObj.row;
        
        if (!mainGrid[row][col].hasFile) {
            return;
        }
        
        if (!(col == this.grabbedEntity.col && row == this.grabbedEntity.row) &&
            !(col == (this.grabbedEntity.col - 1 + NUM_FILES_CIRCUMFERENCE) % NUM_FILES_CIRCUMFERENCE && row == this.grabbedEntity.row) &&
            !(col == this.grabbedEntity.col && row == (this.grabbedEntity.row - 1 + NUM_FILES_VERT) % NUM_FILES_VERT)) {
            this.canReposition = true;
            highlightObj.model.enabled = true;
            highlightObj.model.meshInstances[0].material.update();

            this.highlightObj = highlightObj;
        }
    }
};

LoadFiles.prototype.deactivateHighlight = function(highlightObj) {
    this.canReposition = false;
    if (this.highlightObj) {
        this.highlightObj.model.enabled = false;
        this.highlightObj.model.meshInstances[0].material.update();
        this.highlightObj = null;
    }
};

LoadFiles.prototype.deactivateZoom = function(grabbedEntity) {
    this.zoomActive = false;
    this.grabbing = true;
    
    // reset zoom levels to normal
    for (var j = 0; j < mainGrid.length; j++) {
        for (var i = 0; i < mainGrid[j].length; i++) {
            if (mainGrid[j][i].hasFile) {
                if (mainGrid[j][i].file.isStack) {
                    mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalScale()).to({x: MAX_FILE_WIDTH, y: 1, z: MAX_FILE_HEIGHT}, 0.04, pc.SineOut).start();
                }
                else {
                    mainGrid[j][i].file.tween(mainGrid[j][i].file.getLocalScale()).to({x: mainGrid[j][i].file.w, y: 1, z: mainGrid[j][i].file.h}, 0.04, pc.SineOut).start();
                }
            }
        }
    }
    if (grabbedEntity.isStack) {
        grabbedEntity.setLocalScale(MAX_FILE_WIDTH / 1.3, 1, MAX_FILE_HEIGHT / 1.3);
    } else {
        grabbedEntity.setLocalScale(grabbedEntity.w / 1.3, 1, grabbedEntity.h / 1.3);  
    }
    this.grabbedEntity = grabbedEntity;
};

LoadFiles.prototype.activateZoom = function() {
    this.zoomActive = true;
};

LoadFiles.prototype.onHover = function(entity, point) {
    this.gazeHoverEntity = entity;
    this.gazeHoverPoint.copy(point);
};

LoadFiles.prototype.update = function(dt) {
    // calculate grid rotation based on "horiz offset"
    var gridRotation = 360.0 * gridHorizOffset;
    this.gridAxis.setLocalEulerAngles(0, gridRotation, 0);
    
    this.gridAxis.setLocalPosition(this.gridAxis.position.x, gridVertOffset, this.gridAxis.position.z);
    
    // for (var i = 0; i < rings.length; i++) {
    //     // rings[i].translate(0, 0.003, 0);
    //     if (rings[i].getPosition().y > MAX_RING_Y) {
    //         rings[i].setLocalPosition(0, MIN_RING_Y + 0.001, 0);
    //     }
    //     else if (rings[i].getPosition().y < MIN_RING_Y) {
    //         rings[i].setLocalPosition(0, MAX_RING_Y - 0.001, 0);
    //     }
    // }
    
    if (this.app.xr.camera) {
        var gaze = this.app.xr.camera.forward;
        
        // render ray line
        this.gazeVecA.copy(this.cameraEntity.getPosition());
        this.gazeVecB.copy(gaze);
        this.gazeVecB.scale(10).add(this.gazeVecA);
   
        var rayStart = this.cameraEntity.getPosition();
        var gazeCopy = new pc.Vec3();
        gazeCopy.copy(gaze);
        gazeCopy.scale(GAZE_RAY_LENGTH).add(rayStart);
        
        this.app.fire('object:gaze', this, this.gazeVecA, this.gazeVecB);
        
    }
    if (this.gazeHoverEntity !== null) {  
        if (this.zoomActive) {
            // update files' zoom according to rotation
            this.fire('updateZoom', this.gazeHoverPoint);
        }
    }
};

LoadFiles.prototype.displayStack = function(stackEntity) {
    tempStackRings = [];
    
    this.displayedStack = stackEntity;
    
    // make temporary grid with stack files
    var numRows = Math.ceil(stackEntity.stackFiles.length / NUM_FILES_CIRCUMFERENCE);
    tempStackGrid = [];
    for (var j = 0; j < numRows; j++) {
        tempStackGrid.push([]);
        for (var i = 0; i < NUM_FILES_CIRCUMFERENCE; i++) {
            var obj = {};
            tempStackGrid[j].push(obj);
        }
    }
    
    // push main grid images to background
    for (var j = 0; j < curGrid.length; j++) {
        for (var i = 0; i < curGrid[j].length; i++) {
            if (curGrid[j][i].hasFile) {
                var filePos = getFilePosRadius(i, j, 2 * GRID_RADIUS);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];
                curGrid[j][i].file.tween(curGrid[j][i].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.3, pc.SineOut).start();
                curGrid[j][i].file.tween(curGrid[j][i].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.3, pc.SineOut).start();
                curGrid[j][i].file.tween(curGrid[j][i].file.getLocalScale()).to({x: curGrid[j][i].file.w, y: 1, z: curGrid[j][i].file.h}, 0.3, pc.SineOut).start();
                curGrid[j][i].file.tags.remove("pickable");
                
                curGrid[j][i].horizHighlightObj.enabled = false;
                curGrid[j][i].vertHighlightObj.enabled = false;
            }
        }
    }
    
    var imagesLeft = stackEntity.stackFiles.length;
    for (var row = 0; row < tempStackGrid.length; row++) {
        var ring = makeRing(row);
        this.gridAxis.addChild(ring);
        for (var col = 0; col < tempStackGrid[row].length; col++) {
            if (imagesLeft > 0) {
                tempStackGrid[row][col].hasFile = true;
                tempStackGrid[row][col].file = stackEntity.stackFiles[stackEntity.stackFiles.length - imagesLeft];
                // this.tempStackGrid[row][col].file.isStack = false;
                tempStackGrid[row][col].file.tags.add('pickable');
                tempStackGrid[row][col].file.reparent(ring);
                tempStackGrid[row][col].file.model.enabled = true;
                tempStackGrid[row][col].file.colInStack = col;
                tempStackGrid[row][col].file.rowInStack = row;
                
                var filePos = getFilePos(col, row);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];
                tempStackGrid[row][col].file.tween(tempStackGrid[row][col].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.4, pc.SineOut).start();
                tempStackGrid[row][col].file.tween(tempStackGrid[row][col].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.4, pc.SineOut).start();
                tempStackGrid[row][col].file.tween(tempStackGrid[row][col].file.getLocalScale()).to({x: tempStackGrid[row][col].file.w, y: 0.4, z: tempStackGrid[row][col].file.h}, 0.7, pc.SineOut).start();
                
                imagesLeft -= 1;
            }
        }
        tempStackRings.push(ring);
    }   

    this.displayingStack = true;
    this.app.fire('setdisplayingstack', true);
    curGrid = tempStackGrid;
    
    // set vertical scrolling to center temp grid rows
    setTempGridScroll();
    setTempGridFilesPickable();
    this.app.fire('object:reload');
};

LoadFiles.prototype.rearrangeFiles = function(displacedCol, displacedRow) {
    // would like to animate the movement to be more visually pleasing (and clear)
    this.app.root.sound.play("shuffle");
    var initCol = displacedCol;
    var initRow = displacedRow;
    var rowAbove = null;
    var moveDown = false;
    var moveHorizontal = false;
    // check if there exists a file to the left of the empty col,row
    if (initCol < NUM_FILES_CIRCUMFERENCE - 1 && mainGrid[displacedRow][initCol + 1].file !== null) {
        // iterate through all the files to left of the initial empty space and shifts them to the right
        for (var i=0; i <= NUM_FILES_CIRCUMFERENCE - 1; i++) {
            // checks if the current column is within bounds
            if (displacedCol < NUM_FILES_CIRCUMFERENCE - 1 && mainGrid[displacedRow][displacedCol + 1].file !== null) {
                //set file
                mainGrid[displacedRow][displacedCol].hasFile = true;
                mainGrid[displacedRow][displacedCol].file = mainGrid[displacedRow][displacedCol + 1].file;
                mainGrid[displacedRow][displacedCol + 1].hasFile = false;
                mainGrid[displacedRow][displacedCol + 1].file = null;

                mainGrid[displacedRow][displacedCol].file.col = (displacedCol);
                mainGrid[displacedRow][displacedCol].file.row = displacedRow;

                var filePos = getFilePos(displacedCol, displacedRow);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];

                mainGrid[displacedRow][displacedCol].file.tween(mainGrid[displacedRow][displacedCol].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.7, pc.SineOut).start();
                mainGrid[displacedRow][displacedCol].file.tween(mainGrid[displacedRow][displacedCol].file.getLocalEulerAngles()).to({x: 90, y: 180, z: 0}, 0.7, pc.SineOut).start();

                //increment to get next column
                displacedCol += 1;
                moveHorizontal = true;
            } 
        }
    }
    // check if there exists a file to the left of the empty col,row
    else if (initCol > 0 && mainGrid[displacedRow][initCol - 1].file !== null) {
        // iterate through all the files to right of the initial empty space and shifts them to the left
        for (var i = 0; i <= NUM_FILES_CIRCUMFERENCE - 1; i++) {
            // checks if the current column is within bounds
            if (displacedCol > 0 && mainGrid[displacedRow][displacedCol - 1].file !== null) {

                //set file
                mainGrid[displacedRow][displacedCol].hasFile = true;
                mainGrid[displacedRow][displacedCol].file = mainGrid[displacedRow][displacedCol - 1].file;
                mainGrid[displacedRow][displacedCol - 1].hasFile = false;
                mainGrid[displacedRow][displacedCol - 1].file = null;

                mainGrid[displacedRow][displacedCol].file.col = (displacedCol);
                mainGrid[displacedRow][displacedCol].file.row = displacedRow;

                var filePos = getFilePos(displacedCol, displacedRow);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];

                mainGrid[displacedRow][displacedCol].file.tween(mainGrid[displacedRow][displacedCol].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.7, pc.SineOut).start();
                mainGrid[displacedRow][displacedCol].file.tween(mainGrid[displacedRow][displacedCol].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.7, pc.SineOut).start();

                //increment to get next column
                displacedCol -= 1;
                moveHorizontal = true;
            }
        }
    }
    displacedCol;
    for (var r = displacedRow; r < rings.length - 1; r++) {
        rowAbove = r + 1;
        if (mainGrid[rowAbove][displacedCol].file !== null) {
            var localPosition = mainGrid[rowAbove][displacedCol].file.getLocalPosition();
            var localAngle = mainGrid[rowAbove][displacedCol].file.getEulerAngles();
            
            mainGrid[r][displacedCol].hasFile = true;
            mainGrid[r][displacedCol].file = mainGrid[rowAbove][displacedCol].file;
            mainGrid[rowAbove][displacedCol].hasFile = false;
            mainGrid[rowAbove][displacedCol].file = null;
            

            mainGrid[r][displacedCol].file.col = displacedCol;
            mainGrid[r][displacedCol].file.row = r;
            // update ring entity parenting
            mainGrid[r][displacedCol].file.reparent(rings[r]);
            
            mainGrid[r][displacedCol].file.tween(mainGrid[r][displacedCol].file.getLocalPosition()).to({x: localPosition.x, y: localPosition.y, z: localPosition.z}, 0.7, pc.SineOut).start();
            mainGrid[r][displacedCol].file.tween(mainGrid[r][displacedCol].file.getLocalEulerAngles()).to({x: localAngle.x, y: localAngle.y, z: localAngle.z}, 0.7, pc.SineOut).start();
            moveDown = true;
        }
    }
    
    rowAbove = rings.length - 1; // last ring
    if (!moveDown && rowAbove != displacedRow) {
        for (var c = NUM_FILES_CIRCUMFERENCE - 1; c >= 0; c--) {
            if (mainGrid[rowAbove][c].hasFile) {
                mainGrid[rowAbove - 1][displacedCol].hasFile = true;
                mainGrid[rowAbove - 1][displacedCol].file = mainGrid[rowAbove][c].file;
                mainGrid[rowAbove][c].hasFile = false;
                mainGrid[rowAbove][c].file = null;

                mainGrid[rowAbove - 1][displacedCol].file.col = displacedCol;
                mainGrid[rowAbove - 1][displacedCol].file.row = (rowAbove - 1);

                // update ring entity parenting
                mainGrid[rowAbove - 1][displacedCol].file.reparent(rings[rowAbove - 1]);

                // get position and rotation at (col, row)
                var filePos = getFilePos(displacedCol, rowAbove - 1);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];

                mainGrid[rowAbove - 1][displacedCol].file.tween(mainGrid[rowAbove - 1][displacedCol].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.7, pc.SineOut).start();
                mainGrid[rowAbove - 1][displacedCol].file.tween(mainGrid[rowAbove - 1][displacedCol].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.7, pc.SineOut).start();
                
                break;
            }
        }      
    }
    for(var i=0; i < rings.length - 1; i++) {
        console.log(i);
        console.log(rings[i].children.length);
        if (rings[i].children.length <= 30) {
            for (var c = NUM_FILES_CIRCUMFERENCE - 1; c >= 0; c--) {
                if (mainGrid[rowAbove][c].hasFile && rings[i].children.length < 30) {
                    mainGrid[rowAbove - 1][displacedCol].hasFile = true;
                    mainGrid[rowAbove - 1][displacedCol].file = mainGrid[rowAbove][c].file;
                    mainGrid[rowAbove][c].hasFile = false;
                    mainGrid[rowAbove][c].file = null;

                    mainGrid[rowAbove - 1][displacedCol].file.col = displacedCol;
                    mainGrid[rowAbove - 1][displacedCol].file.row = (rowAbove - 1);

                    // update ring entity parenting
                    mainGrid[rowAbove - 1][displacedCol].file.reparent(rings[rowAbove - 1]);

                    // get position and rotation at (col, row)
                    var filePos = getFilePos(displacedCol, rowAbove - 1);
                    var posY = filePos[1]; // 0 relative to its parent, a ring object
                    var theta = filePos[3];
                    var posX = filePos[0];
                    var posZ = filePos[2];

                    mainGrid[rowAbove - 1][displacedCol].file.tween(mainGrid[rowAbove - 1][displacedCol].file.getLocalPosition()).to({x: posX, y: 0, z: posZ}, 0.7, pc.SineOut).start();
                    mainGrid[rowAbove - 1][displacedCol].file.tween(mainGrid[rowAbove - 1][displacedCol].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, z: 0}, 0.7, pc.SineOut).start();

                    break;
                }
            }   
        }
    }
    console.log(rings[rings.length - 1].children.length);
    if (rings[rings.length - 1].children.length <= 20) {
        var poppedRing = rings.pop();
        poppedRing.destroy();
    }
};

LoadFiles.prototype.checkCanStack = function(releasedEntity, gridHoverPoint, handedness) {

    // don't let stacks be put in stacks
    if (releasedEntity.isStack) {
        this.isStackable[handedness] = false;
        return;  
    }
    
    // -- check for closest file without iterating --  
    // get closest horizontal index
    var theta = Math.atan2(gridHoverPoint.x, gridHoverPoint.z);
    if (theta < 0) theta += 2 * Math.PI; // atan2 returns negative theta sometimes
    var ratio = theta / (2 * Math.PI); // val from 0 to 1
    var horizIndex = Math.round(ratio * NUM_FILES_CIRCUMFERENCE) % NUM_FILES_CIRCUMFERENCE; // modulo because it could reach 0 from just behind 0

    // get closest vertical index
    var height = gridHoverPoint.y + GRID_HEIGHT / 2;
    ratio = height / GRID_HEIGHT;
    var vertIndex = Math.round(ratio * NUM_FILES_VERT) - 1; // additional check for ceiling? (the - 1 is not so good. want actual fix)
    
    if (vertIndex < 0 || vertIndex >= mainGrid.length || !mainGrid[vertIndex][horizIndex].hasFile) {
        return;
    }
    
    var closestEntity = mainGrid[vertIndex][horizIndex].file;
    this.closestFile = closestEntity;
    
    if (this.displayingStack) {
        if (closestEntity.isStack) {
            for (var i = 0; i < closestEntity.stackFiles.length; i++) {
                if (releasedEntity.name == closestEntity.stackFiles[i].name) {
                    // can't put stack file into same stack
                    return;
                }
            }
        }
    }
    
    var dist = gridHoverPoint.distance(closestEntity.position);
    
    if (closestEntity && closestEntity.name != releasedEntity.name && gridHoverPoint.distance(closestEntity.position) < 0.5) { // can't stack on self
        if (!this.isStackable[handedness]) this.app.root.sound.play('tick');
        this.isStackable[handedness] = true;
        this.app.fire('isstackable', true);
        this.focusedFile = closestEntity;
        
        // set stack information
        var displacedCol = releasedEntity.col;
        var displacedRow = releasedEntity.row;
        mainGrid[displacedRow][displacedCol].hasFile = false;
        
        var stackCol = this.focusedFile.col;
        var stackRow = this.focusedFile.row;

        // display stack preview icon
        var filePos = getFilePosRadius(this.focusedFile.col, this.focusedFile.row, GRID_RADIUS * 0.95);
        var posY = filePos[1]; // 0 relative to its parent, a ring object
        var theta = filePos[3];
        var posX = filePos[0];
        var posZ = filePos[2];
        
        releasedEntity.setPosition(posX, this.focusedFile.position.y, posZ);
        releasedEntity.setLocalEulerAngles(this.focusedFile.getLocalEulerAngles());
        releasedEntity.setLocalScale(releasedEntity.w / 2, 1, releasedEntity.h / 2);
    } else {
        releasedEntity.setLocalScale(releasedEntity.w / 1.3, 1, releasedEntity.h / 1.3);
        this.isStackable[handedness] = false;
        this.app.fire('isstackable', false);
    }
};

LoadFiles.prototype.reposition = function(releasedEntity) {    
    this.app.root.sound.play('shuffle');
    
    var entity = releasedEntity;
    
    var col = releasedEntity.col;
    var row = releasedEntity.row;
    
    var colClosest = this.highlightObj.col; 
    var rowClosest = this.highlightObj.row;
    
    var sourceRow = row;
    var sourceCol = col;
    var destinationCol = colClosest;
    var posY;
    var theta;
    var posX;
    var posZ;
    var selectedEntityName;
    var replacementPosition;
    var replacementAngle;
    var tempCol;
    var tempRow;

    
    for (var k = 0; k < NUM_FILES_CIRCUMFERENCE - 1; k++) {
        if (sourceCol === colClosest) {
            col = sourceCol;
            break;
        }
        destinationCol = sourceCol + 1;
        if (destinationCol === NUM_FILES_CIRCUMFERENCE) {
            destinationCol = 0;
        }
        posY = 0; 
        theta = sourceCol * HORIZ_DEGREE_BETWEEN_FILES;
        posX = GRID_RADIUS * Math.sin(theta);
        posZ = GRID_RADIUS * Math.cos(theta);
        theta = RAD_TO_DEG * theta;
        
        // replacement temporary variables
        replacementPosition = new pc.Vec3();
        tempCol = mainGrid[sourceRow][sourceCol].file.col;

        // Swap part 1
        // set focused image to empty slot
        mainGrid[sourceRow][sourceCol].file.col = destinationCol;
        mainGrid[sourceRow][sourceCol].file = mainGrid[sourceRow][destinationCol].file;
        mainGrid[sourceRow][sourceCol].file.tween(mainGrid[sourceRow][sourceCol].file.getLocalPosition()).to({x: posX, y: posY, z: posZ}, 0.7, pc.SineOut).start();
        mainGrid[sourceRow][sourceCol].file.tween(mainGrid[sourceRow][sourceCol].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, 0: posZ}, 0.7, pc.SineOut).start();

        // Swap part 2
        // set released Image to the new empty slot
        var filePos = getFilePosRadius(destinationCol, sourceRow, GRID_RADIUS * 0.95);
        var posY = filePos[1]; // 0 relative to its parent, a ring object
        var theta = filePos[3];
        var posX = filePos[0];
        var posZ = filePos[2];
        
        replacementPosition = new pc.Vec3(posX, posY, posZ);
        replacementAngle = 90, theta + 180, 0
        
        mainGrid[sourceRow][destinationCol].file.col = tempCol;
        mainGrid[sourceRow][destinationCol].file = entity;
        mainGrid[sourceRow][destinationCol].file.tween(mainGrid[sourceRow][destinationCol].file.getLocalPosition()).to({x: replacementPosition.x, y: replacementPosition.y, z: replacementPosition.z}, 0.7, pc.SineOut).start();
        mainGrid[sourceRow][destinationCol].file.tween(mainGrid[sourceRow][destinationCol].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, 0: posZ}, 0.7, pc.SineOut).start();

        mainGrid[sourceRow][sourceCol].hasFile = true;
        mainGrid[sourceRow][destinationCol].hasFile = true;

        sourceCol = destinationCol;
    
    }
    
    sourceRow = row;
    sourceCol = colClosest;
    var destinationRow = rowClosest;
    for (var k = 0; k < NUM_FILES_VERT - 1; k++) {
        if (sourceRow === rowClosest) {
            break;
        }
        
        destinationRow = sourceRow + 1;
        if (destinationRow == NUM_FILES_VERT) {
            destinationRow = 0;
        }
        posY = 0;
        theta = sourceCol * HORIZ_DEGREE_BETWEEN_FILES;
        posX = GRID_RADIUS * Math.sin(theta);
        posZ = GRID_RADIUS * Math.cos(theta);
        theta = RAD_TO_DEG * theta;

        // replacement temporary variables
        replacementPosition = new pc.Vec3();
        replacementPosition.copy(mainGrid[destinationRow][sourceCol].file.getLocalPosition());
        replacementAngle = mainGrid[destinationRow][sourceCol].file.getLocalEulerAngles();
        
        tempRow = mainGrid[sourceRow][sourceCol].file.row;

        var replacementRing = rings[destinationRow];
        var selectedRing = rings[sourceRow];

        // Swap part 1
        // set focused image to empty slot
        mainGrid[sourceRow][sourceCol].file.row = mainGrid[destinationRow][sourceCol].file.row;
        mainGrid[sourceRow][sourceCol].file = mainGrid[destinationRow][sourceCol].file;
        mainGrid[sourceRow][sourceCol].file.reparent(selectedRing);
        mainGrid[sourceRow][sourceCol].file.tween(mainGrid[sourceRow][sourceCol].file.getLocalPosition()).to({x: posX, y: posY, z: posZ}, 0.7, pc.SineOut).start();
        mainGrid[sourceRow][sourceCol].file.tween(mainGrid[sourceRow][sourceCol].file.getLocalEulerAngles()).to({x: 90, y: theta + 180, 0: posZ}, 0.7, pc.SineOut).start();

        // Swap part 2
        // set released Image to the new empty slot
        mainGrid[destinationRow][sourceCol].file.row = tempRow;
        mainGrid[destinationRow][sourceCol].file = entity;
        mainGrid[destinationRow][sourceCol].file.reparent(replacementRing); 
        mainGrid[destinationRow][sourceCol].file.tween(mainGrid[destinationRow][sourceCol].file.getLocalPosition()).to({x: replacementPosition.x, y: replacementPosition.y, z: replacementPosition.z}, 0.7, pc.SineOut).start();
        mainGrid[destinationRow][sourceCol].file.tween(mainGrid[destinationRow][sourceCol].file.getEulerAngles()).to({x: replacementAngle.x, y: replacementAngle.y, z: replacementAngle.z}, 0.7, pc.SineOut).start();

        mainGrid[sourceRow][sourceCol].hasFile = true;
        mainGrid[destinationRow][sourceCol].hasFile = true;

        sourceRow = destinationRow;
    }
    setMainGridFilesPickable()
    this.app.fire('object:reload');
    this.app.fire('deactivatehighlight', this.highlightObj);
};

LoadFiles.prototype.updateScroll = function(scrollPoint, lastScrollPoint) {
    var scrollPointThetaHoriz = Math.atan2(scrollPoint.x, scrollPoint.z);
    var lastScrollPointThetaHoriz = Math.atan2(lastScrollPoint.x, lastScrollPoint.z);
    
    var scrollPointThetaVert = Math.atan2(scrollPoint.y, scrollPoint.z);
    var lastScrollPointThetaVert = Math.atan2(lastScrollPoint.y, lastScrollPoint.z);
    
    thetaVertDiff = scrollPointThetaVert - lastScrollPointThetaVert;
    thetaHorizDiff = scrollPointThetaHoriz - lastScrollPointThetaHoriz;
    if (Math.abs(thetaHorizDiff) > 1) {
        if (thetaHorizDiff < 0) {
            thetaHorizDiff += 2 * Math.PI;
        } else {
            thetaHorizDiff -= 2 * Math.PI;
        }
    }
    // map this difference to a difference in "scrolling"
    // i guess just try out some values until it's nice
    // gridHorizOffset += GRID_HORIZ_SCROLL_MULTIPLIER * thetaHorizDiff;
    gridVertOffset += 1 * thetaVertDiff;
};

LoadFiles.prototype.highlightFile = function(i, j) {

};

LoadFiles.prototype.updateZoom = function(gazeHoverPoint) {
    for (var j = 0; j < curGrid.length; j++) {
        for (var i = 0; i < curGrid[j].length; i++) {
            if (curGrid[j][i].hasFile) {
                var filePos = getFilePosRadius(i, j, GRID_RADIUS);
                var posY = filePos[1]; // 0 relative to its parent, a ring object
                var theta = filePos[3];
                var posX = filePos[0];
                var posZ = filePos[2];
                curGrid[j][i].file.setLocalEulerAngles(90 + 10 * (j - rings.length / 2.0), theta + 180, 0);
                var dist = Math.abs((curGrid[j][i].file.getPosition().distance(gazeHoverPoint)));
                dist = Math.min(dist, MAX_ZOOM_DISTANCE);
                var theta = (-Math.PI) * (dist / MAX_ZOOM_DISTANCE);
                var mult = ZOOM_BASE_MULT * Math.sin(theta) + ZOOM_BASE;
                mult = Math.max(MIN_ZOOM_MULT, mult);
                if (curGrid[j][i].file.isStack) {
                    curGrid[j][i].file.setLocalScale(MAX_FILE_WIDTH * mult, 1, MAX_FILE_HEIGHT * mult);
                }
                else {
                    curGrid[j][i].file.setLocalScale(curGrid[j][i].file.w * mult, 1, curGrid[j][i].file.h * mult); 
                }
                // highlight if within distance
            }
        }
    }

};
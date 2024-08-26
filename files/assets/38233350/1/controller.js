var Controller = pc.createScript('controller');

Controller.prototype.initialize = function() {
    this.RAD_TO_DEG = 360 / (2 * Math.PI);
    
    this.vecA = new pc.Vec3();
    this.vecB = new pc.Vec3();
    this.matA = new pc.Mat4();
    this.quat = new pc.Quat();
    this.color = new pc.Color(1, 1, 1);
    
    this.modelEntity = this.entity.findByName('model');
    this.hoverEntity = null;
    
    this.targetPointerSize = 2;
    this.targetTeleportable = false;
    this.pointer = this.entity.findByName('pointer');
    this.pointer.element.material.depthTest = false;
    this.hoverPoint = new pc.Vec3();
    this.pointerDistance = 3;
    this.gridHoverPoint = new pc.Vec3();
    
    this.grabbing = false;
    this.squeezing = false;
    this.pressing = false;
    this.displayingStack = false;
    this.lastScrollPoint = null;
    this.curScrollPoint = null;
    
    this.gridHoverPointTestEntity = this.app.root.findByName('Test2');
    
    this.cameraEntity = this.app.root.findByName("Camera");
    this.previous = undefined;
    this.gazeRay = new pc.Ray();
    this.gazeVec3A = new pc.Vec3();
    this.gazeVec3B = new pc.Vec3();
    
    this.selectHighlightObject = null;
    
    this.stackable = false;
    this.app.on('isstackable', this.isStackable, this);
    
    var select = this.app.assets.get(38307661);

    this.app.root.sound.addSlot('select', {
        loop: false,
        autoPlay: false,
        asset: select
    });
    
    var openstack = this.app.assets.get(38522697);

    this.app.root.sound.addSlot('openstack', {
        loop: false,
        autoPlay: false,
        asset: openstack
    });
    
    SELECT_HIGHLIGHT_MATERIAL = this.app.assets.findByTag("SelectHighlightMaterial")[0];
    HOVER_HIGHLIGHT_MATERIAL = this.app.assets.findByTag("HoverHighlightMaterial")[0];
    
    var selectHighlightObject = new pc.Entity("SelectHighlightObject");
    selectHighlightObject.addComponent("model", {
        type: "plane",
    });
    selectHighlightObject.model.meshInstances[0].material = SELECT_HIGHLIGHT_MATERIAL.resource;
    selectHighlightObject.model.enabled = false;
    selectHighlightObject.model.meshInstances[0].material.update();
    this.selectHighlightObject = selectHighlightObject;
    
    var hoverHighlightObject = new pc.Entity("HoverHighlightObject");
    hoverHighlightObject.addComponent("model", {
        type: "plane",
    });
    hoverHighlightObject.model.meshInstances[0].material = HOVER_HIGHLIGHT_MATERIAL.resource;
    hoverHighlightObject.model.enabled = false;
    hoverHighlightObject.model.meshInstances[0].material.update();
    this.hoverHighlightObject = hoverHighlightObject;
    
};

Controller.prototype.setInputSource = function(inputSource) {
    var self = this;
    this.inputSource = inputSource;
    this.inputSource.once('remove', this.onRemove, this);
    
    this.on('hover', this.onHover, this);
    this.on('blur', this.onBlur, this);
    this.on('removehover', this.removeHover, this);
    
    this.inputSource.on('select', this.onSelect, this);
    this.inputSource.on('selectstart', this.onSelectStart, this);
    this.inputSource.on('selectend', this.onSelectEnd, this);
    this.app.on('setgridhover', this.setGridHover, this);
    this.app.on('setscrollpoint', this.setScrollPoint, this);
    this.app.on('setdisplayingstack', this.setDisplayingStack, this);
    this.app.on('setselecthighlightobject', this.setSelectHighlightObject, this);
    
    this.app.on('controller:move', this.controllerMove, this);
    this.app.on('controller:rotate', this.controllerRotate, this);
};

Controller.prototype.removeHover = function() {
    this.hoverHighlightObject.reparent(this.app.root);
    this.hoverHighlightObject.model.enabled = false;
};

Controller.prototype.setSelectHighlightObject = function(selectHighlightObject) {
    this.selectHighlightObject = selectHighlightObject;
};

Controller.prototype.setGridHover = function(hoverPoint) {
    this.gridHoverPoint.copy(hoverPoint);
};

Controller.prototype.setDisplayingStack = function(bool) {
    this.displayingStack = bool;
};

Controller.prototype.setScrollPoint = function(scrollPoint) {
    this.curScrollPoint = new pc.Vec3();
    this.curScrollPoint.copy(scrollPoint);
};

Controller.prototype.onRemove = function() {
    this.entity.destroy();
};

Controller.prototype.onSelect = function() {
    this.app.fire('object:pick', this);
    
    if (this.hoverEntity) {
        // teleport
        if (this.targetTeleportable) {
            this.app.fire('controller:teleport', this.hoverPoint);
            
        // paint interactible model
        } else if (this.hoverEntity.tags.has('interactive')) {
            var mesh = this.hoverEntity.model.meshInstances[0];
            
            if (! mesh.pickedColor) mesh.pickedColor = new pc.Color();

            mesh.pickedColor.set(Math.random(), Math.random(), Math.random());
            mesh.setParameter('material_diffuse', mesh.pickedColor.data3);
        }
    }
};

Controller.prototype.onSelectStart = function() {
    if (this.hoverEntity) {
        this.app.root.sound.play('select');
        this.grabbing = true;
        if (this.displayingStack) {
            this.app.fire('showmaingrid');
        }
        this.app.fire('deactivatezoom', this.hoverEntity, this);
        this.selectHighlightObject.reparent(this.hoverEntity);
        this.selectHighlightObject.model.enabled = true;
        this.hoverHighlightObject.model.enabled = false;
        
    }
};

Controller.prototype.onSelectEnd = function() {
    this.grabbing = false;
    this.app.fire('handlecontrollerrelease', this.hoverEntity, this.inputSource.handedness == pc.XRHAND_LEFT ? 1 : 0);
    this.app.fire('activatezoom');
    
    if (this.selectHighlightObject.model) {
        this.selectHighlightObject.reparent(this.app.root);
        this.selectHighlightObject.model.enabled = false;
    } else {
        this.selectHighlightObject.destroy();
        var selectHighlightObject = new pc.Entity("SelectHighlightObject");
        selectHighlightObject.addComponent("model", {
            type: "plane",
        });
        selectHighlightObject.model.meshInstances[0].material = SELECT_HIGHLIGHT_MATERIAL.resource;
        selectHighlightObject.model.enabled = false;
        selectHighlightObject.model.meshInstances[0].material.update();
        this.selectHighlightObject = selectHighlightObject;
    }

};

Controller.prototype.onHover = function(entity, point) {
    this.hoverEntity = entity;
    this.hoverPoint.copy(point);
    this.targetPointerSize = 16;
    this.targetTeleportable = this.hoverEntity.tags.has('teleportable');
    this.hoverHighlightObject.reparent(this.hoverEntity);
    if (this.hoverHighlightObject.model) {
        this.hoverHighlightObject.model.enabled = true;
    } else {
        var hoverHighlightObject = new pc.Entity("HoverHighlightObject");
        hoverHighlightObject.addComponent("model", {
            type: "plane",
        });
        hoverHighlightObject.model.meshInstances[0].material = HOVER_HIGHLIGHT_MATERIAL.resource;
        hoverHighlightObject.model.enabled = false;
        hoverHighlightObject.model.meshInstances[0].material.update();
        this.hoverHighlightObject = hoverHighlightObject;
    }
    
};

Controller.prototype.onBlur = function() {
    this.hoverEntity = null;
    this.targetPointerSize = 4;
    this.targetTeleportable = false;
};

Controller.prototype.isStackable = function(bool) {
    this.isStackable = bool;
};

Controller.prototype.update = function(dt) {    
    if (!this.grabbing) {
        // pick entities
        this.app.fire('object:pick', this);
        if (this.hoverEntity && this.hoverEntity.tags.has("stack")) {
            if (this.hoverEntity.position.distance(this.hoverPoint) < 0.5) {

            }
        }
    }


    // is can be gripped, enable model and transform it accordingly
    if (this.inputSource.grip) {
        this.modelEntity.enabled = true;
        this.entity.setPosition(this.inputSource.getPosition());
        this.entity.setRotation(this.inputSource.getRotation());
        
        // render ray line
        this.vecA.copy(this.inputSource.getOrigin());
        this.vecB.copy(this.inputSource.getDirection());
        this.vecB.scale(1000).add(this.vecA);
        if (this.inputSource.selecting) {
            this.color.set(0, 1, 0);
        } else {
            this.color.set(1, 1, 1);
        }
        this.app.renderLine(this.vecA, this.vecB, this.color);
    }
    
    // hovered entity pointer distance
    if (this.hoverEntity) {
        var dist = this.vecA.copy(this.hoverPoint).sub(this.inputSource.getOrigin()).length();
        this.pointerDistance += (dist - this.pointerDistance) * 0.3;
    }
    
    // pointer position
    this.vecA.copy(this.inputSource.getDirection()).scale(this.pointerDistance).add(this.inputSource.getOrigin());
    this.pointer.setPosition(this.vecA);
    
    // pointer size
    var pointerSize = this.targetPointerSize * (this.targetTeleportable ? 8 : 1);
    if (this.pointer.element.width !== pointerSize) {
        this.pointer.element.width += (pointerSize - this.pointer.element.width) * 0.3;
        
        if (Math.abs(this.pointer.element.width - pointerSize) <= 1)
            this.pointer.element.width = pointerSize;
        
        this.pointer.element.height = this.pointer.element.width;
    }
    
    // gamepad input
    var gamepad = this.inputSource.gamepad;
    if (gamepad) {
        // left controller thumbstick for move
        if (this.inputSource.handedness === pc.XRHAND_LEFT && Math.abs(gamepad.axes[0]) + Math.abs(gamepad.axes[1]) > 0.4) {
            this.app.fire('controller:move', gamepad.axes[0], gamepad.axes[1], dt);
            
        // right controller thumbstick for turn
        } else if (this.inputSource.handedness === pc.XRHAND_RIGHT && Math.abs(gamepad.axes[0]) > 0.35) {
            this.app.fire('controller:rotate', -gamepad.axes[0], dt);
        }
        if (gamepad.buttons[1].pressed) {
            this.squeezing = true;
        } else {
            this.squeezing = false;
            this.lastScrollPoint = null;
            this.curScrollPoint = null;
        }
        if (!this.pressing && !this.displayingStack && gamepad.buttons[2].pressed) {
            this.pressing = true;
            if (this.hoverEntity && this.hoverEntity.isStack) {
                this.app.root.sound.play('openstack');
                this.displayingStack = true;
                this.app.fire('setdisplayingstack', true);
                this.app.fire('displaystack', this.hoverEntity);
            }
        } else if (!this.pressing && this.displayingStack && gamepad.buttons[2].pressed) {
            this.app.root.sound.play('openstack');
            this.pressing = true;
            this.displayingStack = false;
            this.app.fire('setdisplayingstack', false);
            this.app.fire('stopdisplayingstack');
        }
        if (!gamepad.buttons[2].pressed) this.pressing = false;
    }
    
    if (this.grabbing) {
        this.app.fire('object:controllergridhover', this);
        if (this.gridHoverPoint && this.hoverEntity) {
            if (!this.stackable) {
                this.hoverEntity.setPosition(this.gridHoverPoint.x, this.gridHoverPoint.y, this.gridHoverPoint.z); // TODO: want to bring this forward slightly
                var theta = Math.atan2(this.gridHoverPoint.x, this.gridHoverPoint.z);
                theta = this.RAD_TO_DEG * theta;   
                this.hoverEntity.setLocalEulerAngles(90, theta + 180, 0);
            } 

            // check if hovering over another file
            this.app.fire('checkcanstack', this.hoverEntity, this.gridHoverPoint, this.inputSource.handedness == pc.XRHAND_LEFT ? 1 : 0);
        }
    } else if (this.squeezing) { // for scrolling
        this.app.fire('object:scrollerspherehover', this);
        if (this.curScrollPoint) {
            if (this.lastScrollPoint) {
                this.app.fire('updatescroll', this.curScrollPoint, this.lastScrollPoint);
            }
            this.lastScrollPoint = new pc.Vec3();
            this.lastScrollPoint.copy(this.curScrollPoint);
        }
    }
};
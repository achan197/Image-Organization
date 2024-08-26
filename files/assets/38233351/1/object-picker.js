var ObjectPicker = pc.createScript('objectPicker');

ObjectPicker.prototype.initialize = function() {
    this.pickableEntities = this.app.root.findByTag('pickable');
    
    this.controllerRay = new pc.Ray();
    this.controllerVec3A = new pc.Vec3();
    this.controllerVec3B = new pc.Vec3();
    
    this.controllerVec3C = new pc.Vec3();
    this.controllerVec3D = new pc.Vec3();
    
    this.gazeRay = new pc.Ray();
    this.gazeVec3A = new pc.Vec3();
    this.gazeVec3B = new pc.Vec3();
    
    this.app.on('object:pick', this.pick, this);
    this.app.on('object:gaze', this.gaze, this);
    this.app.on('object:controllergridhover', this.controllerGridHover, this);
    this.app.on('object:scrollerspherehover', this.scrollerSphereHover, this);
    
    this.app.on('object:reload', this.reloadEntities, this);
};

ObjectPicker.prototype.reloadEntities = function() {
    this.pickableEntities = this.app.root.findByTag('pickable');
    this.gridColliderCylinder = this.app.root.findByName('GridCollisionCylinder');
};


// new with physics engine
ObjectPicker.prototype.pick = function(controller) {
    var hovered = null;
    var distance = Infinity;
    
    var rayStart = controller.inputSource.getOrigin();
    var rayEnd = new pc.Vec3();
    rayEnd.add2(rayStart, controller.inputSource.getDirection().scale(10));
    var raycastResult = this.app.systems.rigidbody.raycastAll(rayStart, rayEnd);

    for (var i = 0; i < raycastResult.length; i++) {
        if (raycastResult[i].entity.tags.has("pickable")) {
            var dist = raycastResult[i].point.distance(rayStart);
            if (dist < distance) {
                // if closer than previous candidate, remember it
                distance = dist;
                hovered = raycastResult[i];
            }
        }
    }

    if (hovered) {
        controller.fire('hover', hovered.entity, hovered.point);
    } else {
        controller.fire('removehover');
        if (controller.hoverEntity) {
            controller.fire('blur');
        }
    }
};

// new with phsyics engine
ObjectPicker.prototype.gaze = function(loadfiles, gazeVecA, gazeVecB) {
    // this.controllerRay.set(rayCopy, contDir.scale(-1));
    // 
    // this.gazeVecA.copy(this.cameraEntity.getPosition());
    // this.gazeVecB.copy(gaze);
    // this.gazeVecB.scale(10).add(this.gazeVecA);
    var raycastResult = this.app.systems.rigidbody.raycastAll(gazeVecB, gazeVecA);
    // console.log(raycastResult);
    // get mesh
    var mesh = this.gridColliderCylinder.model.meshInstances[0];
    // check if it intersects with controllers ray
    for (var i = 0; i < raycastResult.length; i++) {
        if (raycastResult[i].entity.name == "GridCollisionCylinder") {
            // this.gazeVec3B.copy(raycastResult[i].);
            loadfiles.fire('hover', this.gridColliderCylinder, raycastResult[i].point);
            return;
        }
    }
};

// new with physics engine
ObjectPicker.prototype.controllerGridHover = function(controller) {
    var rayStart = controller.inputSource.getOrigin();
    var rayEnd = new pc.Vec3();
    rayEnd.copy(rayStart);
    rayEnd.add(controller.inputSource.getDirection().scale(10));

    var raycastResult = this.app.systems.rigidbody.raycastAll(rayEnd, rayStart);
    
    // check if it intersects with controllers ray
    var foundHighlight = false;
    for (var i = 0; i < raycastResult.length; i++) {
        if (raycastResult[i].entity.name == "GridCollisionCylinder") {
            this.app.fire('setgridhover', raycastResult[i].point);
        }
        else if (raycastResult[i].entity.name.startsWith("HighlightObject")) {
            this.app.fire('activatehighlight', raycastResult[i].entity);
            foundHighlight = true;
        }
    }
    if (!foundHighlight) this.app.fire('deactivatehighlight');
};


// new with physics engine
ObjectPicker.prototype.scrollerSphereHover = function(controller) {
    var rayStart = controller.inputSource.getOrigin();
    var rayEnd = new pc.Vec3();
    rayEnd.copy(rayStart);
    rayEnd.add(controller.inputSource.getDirection().scale(10));

    var raycastResult = this.app.systems.rigidbody.raycastAll(rayEnd, rayStart);

    // check if it intersects with controllers ray
    var foundHighlight = false;
    for (var i = 0; i < raycastResult.length; i++) {
        if (raycastResult[i].entity.name == "ScrollerSphere") {
            this.app.fire('setscrollpoint', raycastResult[i].point);
        }
    }
};
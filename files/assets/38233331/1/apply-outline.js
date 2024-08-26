var ApplyOutline = pc.createScript('applyOutline');

ApplyOutline.attributes.add('color', { type: 'rgba' });
ApplyOutline.attributes.add("thickness", {
  type: "number",
  default: 1.0,
  min: 1.0,
  max: 10,
  precision: 0,
  title: "Thickness"
});

// initialize code called once per entity
ApplyOutline.prototype.initialize = function() {
  
    this.color = new pc.Color(35/255.0, 200/255.5, 255/255.0);
    this.thickness = 3;
    
    // --- variables
    this.vec = new pc.Vec3();
    
    // --- execute
    this.prepare();
    
    // --- events
    window.addEventListener("resize", this.onResize.bind(this) );
    
    this.app.on('Ermis:objectOutline:add', function(entity) {

        if( entity && entity.model && entity.model.layers.indexOf(this.outlineLayer.id) === -1 ){
            
            var layers = entity.model.layers.slice();
            layers.push(this.outlineLayer.id);
            
            entity.model.layers = layers;
        }
        
    }, this);
    
    this.app.on('Ermis:objectOutline:remove', function(entity){
        
        var index = entity.model.layers.indexOf(this.outlineLayer.id);
        
        if( entity && entity.model && index > -1 ){
            
            var layers = entity.model.layers.slice();
            layers.splice(index, 1);
            
            entity.model.layers = layers;
        }        
        
    }, this);
};

ApplyOutline.prototype.prepare = function() {
    
    // create texture and render target for rendering into, including depth buffer
    this.texture = new pc.Texture(this.app.graphicsDevice, {
        width: this.app.graphicsDevice.width,
        height: this.app.graphicsDevice.height,
        format: pc.PIXELFORMAT_R8_G8_B8_A8,
        autoMipmap: true,
        minFilter: pc.FILTER_LINEAR,
        magFilter: pc.FILTER_LINEAR
    });
    this.renderTarget = new pc.RenderTarget(this.app.graphicsDevice, this.texture, { depth: true });

    // get layers
    this.worldLayer = this.app.scene.layers.getLayerByName("World");    
    this.outlineLayer = this.app.scene.layers.getLayerByName("OutlineLayer");    

    // set up layer to render to the render target
    this.outlineLayer.renderTarget = this.renderTarget;
    
    // Create outline camera, which renders entities in outline layer
    this.outlineCamera = new pc.Entity();
    this.outlineCamera.addComponent("camera", {
        clearColor: new pc.Color(0.0, 0.0, 0.0, 0.0),
        layers: [this.outlineLayer.id],
        fov: this.app.root.findByName('Camera').camera.fov
    });
    this.app.root.addChild(this.outlineCamera);    
    
    // instanciate outline post process effect
    this.outline = new pc.OutlineEffect(this.app.graphicsDevice, this.thickness);
    this.outline.color = new pc.Color(0, 0, 1, 1);
    this.outline.texture = this.texture;
    this.entity.camera.postEffects.addEffect(this.outline);
};

ApplyOutline.prototype.onResize = function(){

    this.entity.camera.postEffects.removeEffect(this.outline);

    this.app.scene.layers.remove(this.outlineLayer);
    
    this.texture.destroy();
    this.texture = new pc.Texture(this.app.graphicsDevice, {
        width: this.app.graphicsDevice.width,
        height: this.app.graphicsDevice.height,
        format: pc.PIXELFORMAT_R8_G8_B8_A8,
        autoMipmap: true,
        minFilter: pc.FILTER_LINEAR,
        magFilter: pc.FILTER_LINEAR
    });
    this.renderTarget.destroy();
    this.renderTarget = new pc.RenderTarget(this.app.graphicsDevice, this.texture, { depth: true });
    this.outlineLayer.renderTarget = this.renderTarget;

    this.app.scene.layers.insert(this.outlineLayer, 0);

    this.outline.texture = this.texture;
    this.entity.camera.postEffects.addEffect(this.outline);
};

// update code called every frame
ApplyOutline.prototype.update = function(dt) {
        
    var transform = this.entity.getWorldTransform();

    this.outlineCamera.setPosition(transform.getTranslation());        
    this.outlineCamera.setEulerAngles(transform.getEulerAngles());
    this.outlineCamera.setLocalScale(transform.getScale());
    
    this.outlineCamera.camera.horizontalFov = this.app.graphicsDevice.width > this.app.graphicsDevice.height ? false : true;
    
    // update color
    this.outline.color.copy(this.color);
};
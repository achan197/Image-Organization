var Controllers = pc.createScript('controllers');

Controllers.attributes.add('controllerTemplate', {
    type: 'entity',
    title: 'Controller Template'
});

Controllers.attributes.add('cameraParent', {
    type: 'entity',
    title: 'Camera Parent'
});

Controllers.prototype.initialize = function() {
    // when controller is added
    this.app.xr.input.on('add', function (inputSource) {
        // clone controller entity template
        var entity = this.controllerTemplate.clone();
        // set input source
        entity.script.controller.setInputSource(inputSource);
        // reparent to camera parent entity
        entity.reparent(this.cameraParent);
        entity.enabled = true;
    }, this);
};

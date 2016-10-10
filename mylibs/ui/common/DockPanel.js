define(["framework/Container", "framework/DockArrangeStrategy", "framework/PropertyMetadata"], function(Container, DockArrangeStrategy, PropertyMetadata){
    PropertyMetadata.extend("sketch.framework.Container", {
               "sketch.ui.common.DockPanel": {

               }
           });


    //obsolete, use fwk.Container.CreateDock()
    return klass2('sketch.ui.common.DockPanel', Container, {
        _constructor: function(){
            this.arrangeStrategy(new DockArrangeStrategy(this));
        }
    });
});
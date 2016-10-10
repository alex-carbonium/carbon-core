define(["framework/Container", "framework/AlignArrangeStrategy", "framework/PropertyMetadata"], function(Container, AlignArrangeStrategy, PropertyMetadata){
    PropertyMetadata.extend("sketch.framework.Container", {
            "sketch.ui.common.AlignPanel": {

            }
        });

    //obsolete, use fwk.Container.CreateAlign()
    return klass2('sketch.ui.common.AlignPanel', Container, {
        _constructor: function(){
            this.arrangeStrategy(new AlignArrangeStrategy(this));
        }
    });
});
define(["framework/Container", "framework/StackArrangeStrategy", "framework/PropertyMetadata"], function(Container, StackArrangeStrategy, PropertyMetadata) {
    PropertyMetadata.extend("sketch.framework.Container", {
       "sketch.ui.common.StackPanel": {

       }
   });


    //obsolete, use fwk.Container.CreateStack()
    return klass2('sketch.ui.common.StackPanel', Container, {
        _constructor: function(){
            this.arrangeStrategy(new StackArrangeStrategy(this));
        }
    });
});
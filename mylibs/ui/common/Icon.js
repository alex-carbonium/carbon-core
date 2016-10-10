define(["framework/ImageElement", "framework/PropertyMetadata"], function(ImageElement, PropertyMetadata){
    var Icon = klass2('sketch.ui.common.Icon', ImageElement, {
        _constructor: function() {
            this.clipSelf(true);
        }
    });

    PropertyMetadata.extend("sketch.framework.ImageElement", {
        "sketch.ui.common.Icon": {
            source: {
                displayName: "Source",
                type: "icon",
                useInModel: true,
                editable: true
            }
        }
    });

    return Icon;
});
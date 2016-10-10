define(["framework/ImageElement", "framework/PropertyMetadata", "framework/QuadAndLock", "framework/ImageSource"], function(ImageElement, PropertyMetadata, QuadAndLock, ImageSource) {
    var Image = klass2('sketch.ui.common.Image', ImageElement, {
        _constructor: function() {
            this.clipSelf(true);
        }
    });

    PropertyMetadata.extend("sketch.framework.ImageElement", {
        "sketch.ui.common.Image": {
            source: {
                displayName: "Source",
                type: "image",
                useInModel: true,
                editable: true,
                defaultValue:ImageSource.None()
            },
            cornerRadius: {
                displayName: "Corner radius",
                type: "quadAndLock",
                useInModel: true,
                editable: true,
                defaultValue:QuadAndLock.Default
            },
            displayMode: {
                displayName: "Display mode",
                type: "choice",
                possibleValues: ImageElement.PossibleValues,
                useInModel: true,
                editable: true,
                defaultValue:"stretch"
            }
        }
    });

    return Image;
});
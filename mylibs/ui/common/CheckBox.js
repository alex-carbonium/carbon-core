

(function(ui, fwk) {
    fwk.PropertyMetadata.extend("sketch.framework.ImageElement", {
           "sketch.ui.common.CheckBox": {

           }
       });
    klass2('sketch.ui.common.CheckBox', fwk.ImageElement, {
        _callSuper: false,
        _constructor: function(){
            ui.CheckBox.SuperConstructor.call(this, ui.CheckBox.checkedImageUrl, 16, 16);

            var that = this;
            var checked = this.properties.createProperty("checked", "Checked", true)
                .editorTemplate("#editor-checkbox")
                .useInModel();
        },
        propsUpdated:function(props){
            fwk.ImageElement.prototype.propsUpdated.apply(this, arguments);
            if (props.checked) {
                this.src(ui.CheckBox.checkedImageUrl);
            }
            else {
                this.src(ui.CheckBox.unCheckedImageUrl);
            }
        },
        checked:function(value){
            return this.properties.checked.value(value);
        }
    });

    ui.CheckBox.checkedImageUrl = "img/checkbox/checked.png";
    ui.CheckBox.unCheckedImageUrl = "img/checkbox/unchecked.png";
})(sketch.ui.common, sketch.framework);
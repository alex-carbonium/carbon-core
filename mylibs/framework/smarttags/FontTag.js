define(["./SmartTag", "ui/editors/Registrar"], function(SmartTag, Registrar){
    var fwk = sketch.framework;
    return klass2("sketch.framework.smarttags.FontTag", SmartTag, (function(){

        return {
            _constructor:function(element){
                this._element = element;
                this.template('smarttags_fontTag');
                var font = element.props.font;
                var editor = this._editor = Registrar.createEditor(font, 1);

                this.actions = [editor.getChildEditor("bold"), editor.getChildEditor("italic"), editor.getChildEditor("underline")];
                this.sizeViewModel = editor.getChildEditor("size");
            },
            dispose:function() {
                this._editor.dispose();
                SmartTag.prototype.dispose.apply(this, arguments);
            }

        }
    })())

});

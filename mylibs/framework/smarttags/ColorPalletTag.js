define(["./SmartTag", "ui/editors/Registrar"], function(SmartTag, Registrar){
    var fwk = sketch.framework;

    return klass2("sketch.framework.smarttags.ColorPalletTag", SmartTag, (function(){
        return {
            _constructor:function(element){
                this._element = element;
                this.template('smarttags_colorPalletTag');

                var pallet = fwk.Resources.getColorPalette().slice(0, 14);
                for(var i = 0; i < pallet.length; ++i){
                    if(!pallet[i]){
                        pallet[i] = '#fff';
                    }
                }
                this.colors = ko.observableArray(pallet);

                var font = element.props.font;
                var editor = this._editor = Registrar.createEditor(font, 1);
                this.colorEditor = editor.getChildEditor("color");
            },
            selectColor: function(color, index) {
                this.colorEditor.setValueByCommand(fwk.Brush.createFromColor(color));
            },
            dispose:function(){
                if(this._editor) {
                    this._editor.dispose();
                    delete this._editor;
                }
                SmartTag.prototype.dispose.apply(this, arguments);
            }
        }
    })())

});

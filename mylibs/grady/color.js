define(["./ColorPaletteViewModel"], function (ColorPaletteViewModel) {
    var fwk = sketch.framework;
    return klass((function () {
        var defaultOptions = {
            colorReturnMode:"rgba", //rgba, hex
            data:{color:null}
        };

        return {
            colorPickerColor: null,
            _constructor:function () {
                this.properties = new fwk.Properties();
                this.properties.createProperty("colorReturnMode", "", "rgba" /* or hex */);
                this.properties.createProperty("color", "", null);
                this.colorPickerColor = ko.observable("#000000");
                this.onColorUpdate = EventHelper.createEvent();
                this.onColorUpdating = EventHelper.createEvent();
                this.colorPicker = $();
                this._colorPalletModel = new ColorPaletteViewModel();
                this._colorPalletModel.colorChanged.bind(this, function(color){
                    var rgba = colors.stringToRgbArray(color);
                    this.onColorUpdating.raise(this.setColor(rgba, true));
                });

            },
            colorReturnMode:function (value) {
                return this.properties.colorReturnMode.value(value);
            },
            color:function (value, update) {
                value = this.properties.color.value(value);
                this._colorPalletModel.activeColor(value);

                if(update){
                    this.colorPickerColor(value);
                }
                return value;
            },
            setColor:function (rgb, update) {
                return this.color(colors.RGBToRGBA(rgb), update);
            },
            colorPickerOptions: function(){
                var that = this;
                return {
                    color:that.color() || "#000000",
                    flat:true,
                    onChange:function (hsb, hex, rgb) {
                        that.onColorUpdate.raise(that.setColor(rgb));
                    },
                    onChanging:function (hsb, hex, rgb) {
                        that.onColorUpdating.raise(that.setColor(rgb));
                    }
                };
            },
            colorPalletViewModel:function(){
                return this._colorPalletModel;
            },
            dispose:function () {
                this.onColorUpdate.clearSubscribers();
                this.onColorUpdating.clearSubscribers();
            }
        }
    })());
});
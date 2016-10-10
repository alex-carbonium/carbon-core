define(function () {
    var fwk = sketch.framework;
    return klass2("sketch.grady.ColorPaletteViewModel", null, (function () {
        var MAX_COLOR_COUNT = 28;
        return {
            _constructor:function () {
                this.selectedColorIndex = ko.observable(0);
                this.colorChanged = fwk.EventHelper.createEvent();
                this.activeColor = ko.observable("#fff");
                this._lastAddedColor = -1;
                var pallet = fwk.Resources.getColorPalette().slice(0, MAX_COLOR_COUNT);
                for(var i = 0; i < MAX_COLOR_COUNT; ++i){
                    if(!pallet[i]){
                        pallet[i] = '#fff';
                    }
                }
                this.colors = ko.observableArray(pallet);
            },
            dragOptions:{
                helper:"clone"
            },
            dropOptions:function(){
                var that = this;
                return {
                    drop:function(event, ui){
                        var color = that.activeColor();
                        var index = $(event.target).attr('data-index');
                        that.colors.splice(index, 1, color);
                        fwk.Resources.setUserColor(color, index);
                    }
                };
            },
            selectColor:function(data, index){
                this.colorChanged.raise(data);
                this._lastAddedColor = index - 1;
                this.selectedColorIndex(index);
            },
            addUserColor:function(){
                this._lastAddedColor++;
                var color = this.activeColor();
                this.colors.splice(this._lastAddedColor, 1, color);
                fwk.Resources.setUserColor(color, this._lastAddedColor);
                if(this._lastAddedColor >= MAX_COLOR_COUNT-1){
                    this._lastAddedColor = -1;
                }
                this.selectedColorIndex(this._lastAddedColor+1);
            }
        }
    })());
});
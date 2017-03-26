define(["./ColorPaletteViewModel"], function (ColorPaletteViewModel) {
    var fwk = sketch.framework;
    return klass((function () {
        var sliderRemoveDistance = 20;
        var tooltipOffset = 4;

        var defaultOptions = {
            colorReturnMode:"rgba", //rgba, hex
            data:{color:null}
        };

        var slider = function(options){
            this.backgroundColor = ko.observable(options.backgroundColor);
            this.isSelected = ko.observable(options.selected);
            this.position = ko.observable(parseInt(options.position));
            this.visible = ko.observable(true);
        };

        var directionIcon = function(direction, selected){
            this.direction = direction;
            this.isSelected = ko.observable(selected);
        };

        var toolTip = function(){
            this.left = ko.observable(0);
            this.visible = ko.observable(false);
            this.text = ko.observable(0);
        }

        var setupDirectionIcons = function(){
            var that = this;
            var icons = ["down", "up", "left", "right", "radial"];

            var shouldBeSelected = "down";
            each(icons, function(direction){
                that.directionIcons.push(new directionIcon(direction, (direction == shouldBeSelected)));
            });

        };

        var setupDefaultSliders = function(){

            this.sliders.push(new slider({backgroundColor:this.sliderDefaultColor(), selected: true, position: toPosition.call(this, 0)}));
            this.sliders.push(new slider({backgroundColor: "#a5cf1b", selected:false, position: toPosition.call(this, 100)}));

            this.colorPickerColor(this.sliderDefaultColor()); //set first color as default
            this.selectedSlider = this.sliders()[0];
        };


        var clickSlider = function (data) {
            //if selected is  other

            if (this.selectedSlider == data)
                return;

            if(this.selectedSlider) //if some slider was chosen before
                this.selectedSlider.isSelected(false);

            this.colorPickerColor(data.backgroundColor());
            this.selectedSlider = data;
            this.selectedSlider.isSelected(true);
            this._colorPalletModel.activeColor(data.backgroundColor());

            hideTooltip.call(this);
        };

        var sliderColorChange = function(color){
            if(this.selectedSlider) {
                this.selectedSlider.backgroundColor(color);
            }
            triggerRedraw.call(this, false, true);
        };

        var sliderColorChanging = function(color) {
            if(this.selectedSlider) {
                this.selectedSlider.backgroundColor(color);
            }
            this._colorPalletModel.activeColor(color);
            triggerRedraw.call(this, true, false);
        }

        //canvas
        var redrawCanvas = function(context, w, h) {
            var that = this;
            clearCanvas.call(this, context, w, h);
            drawGradient.call(this, context, w, h);


            if( this.firedEvents.isChanged === true ){
                this.clearEvents(); //immidiatelly remove events, so do not cause loop
                this.onGradientUpdate.raise({sliders:fetchSliders.call(this), direction: this.gradientDirection()});
            }
            if ( this.firedEvents.isChanging === true ) {
                this.clearEvents(); //immidiatelly remove events, so do not cause loop
                this.onGradientUpdating.raise({sliders:fetchSliders.call(this), direction: this.gradientDirection()});
            }
        };

        var clearCanvas = function(context, w, h ) {
            context.clearRect(0, 0, w, h);
        };

        var drawGradient = function(context, w, h) {
            var that = this,
                gradient = context.createLinearGradient(0, 0, w, 0);

            each(this.sliders(), function(slider){
                if(slider.visible()) {
                    var position = parseInt(slider.position()), //take position left. if it is 0, then try to parse it from attr
                        gradTill = position / w, //1 is for zoom
                        color = slider.backgroundColor();

                    gradient.addColorStop((gradTill > 1 ? 1 : gradTill), color);
                }
            });

            context.fillStyle = gradient;
            context.fillRect(0, 0, w, h);
            context.fill();
        };

        var showTooltip = function(left){
            this.toolTip.visible(true);
            this.toolTip.x(left - tooltipOffset);
            this.toolTip.text(~~(left/this.coef));
        };

        var hideTooltip = function(){
            this.toolTip.visible(false);
        };

        var toPosition = function(left) {
            return left * this.coef;
        };

        var toPercentage = function(left) {
            return ~~(left/this.coef);
        };

        var addNewSlider = function(left){
            var newSlider = new slider({backgroundColor: this.sliderDefaultColor(), selected: false, position: left});
            this.sliders.push(newSlider);
            clickSlider.call(this, newSlider);

            triggerRedraw.call(this, false, true);
        };
        var removeSlider = function(data) {
            this.sliders.remove(data);
        };

        var removeAllSliders = function(){
            var length = this.sliders().length;
            this.sliders.splice(1, length);
            triggerRedraw.call(this, false, true);
        };

        var triggerRedraw = function(isChanging, isChanged) {
            this.fireEvents(isChanging, isChanged);
            this.forceRedraw.valueHasMutated();
        };

        var fetchSliders = function() {
            var sliders = [],
                that = this;

            // we give sliders as they are in html
            each(this.sliders(), function(slider){
                if(slider.visible()) {
                    sliders.push([toPercentage.call(that, slider.position()), slider.backgroundColor()]);
                }
            });
            return sliders;
        };

        return {
            firedEvents: {isChanging:false, isChanged:false},
            canvasDim: {width:350, height:25},
            sliders: null,
            directionIcons: null,
            forceRedraw: null,
            colorPickerColor: null,
            selectedSlider: null,
            coef: null,
            _constructor:function () {
                this.properties = new fwk.Properties();
                this.properties.createProperty("colorReturnMode", "", "rgba" /* or hex */);
                this.properties.createProperty("sliderDefaultColor", "", "#f0f0f0");
                this.properties.createProperty("gradientDirection", "", "down");

                this.coef = (this.canvasDim.width/100);
                this.forceRedraw = ko.observable(null);
                this.directionIcons = ko.observableArray([]);
                this.sliders = ko.observableArray([]);
                this.colorPickerColor = ko.observable(this.sliderDefaultColor());
                this.toolTip = new toolTip();

                setupDefaultSliders.call(this);
                setupDirectionIcons.call(this);

                this.onGradientUpdate = EventHelper.createEvent();
                this.onGradientUpdating = EventHelper.createEvent();
                this.colorPicker = $();

                var that = this;
                this._colorPalletModel = new ColorPaletteViewModel();
                this._colorPalletModel.colorChanged.bind(this, function(color){
                    sliderColorChanging.call(that,color);
                });
            },
            canvasClick: function(_, event) {
                var left = event.originalEvent.layerX - 5;
                addNewSlider.call(this, left);
            },
            convertColor: function (hsb, hex, rgb) {
                var value;
                var mode = this.colorReturnMode();
                if (mode == "hex") {
                    value = "#" + value;
                } else if (mode == "rgba") {
                    value = colors.RGBToRGBA(rgb);
                }
                return value;
            },
            redrawCanvas: function(context, w, h){
                this.canvas = {w: w, h: h};
                redrawCanvas.call(this, context, w, h);
            },
            selectDirection: function(icon){
                //unselect previously selected icon
                each(this.directionIcons(), function(di){
                    if(di.isSelected())
                        di.isSelected(false);
                });

                //and select clicked one
                icon.isSelected(true);
                this.gradientDirection(icon.direction);
                triggerRedraw.call(this, false, true);
            },
            //////
            gradientDirection:function (value) {
                return this.properties.gradientDirection.value(value);
            },
            colorReturnMode:function (value) {
                return this.properties.colorReturnMode.value(value);
            },
            sliderDefaultColor:function (value) {
                return this.properties.sliderDefaultColor.value(value);
            },
            ////
            colorPickerOptions: function(){
                var that = this;
                return {
                    color: that.sliderDefaultColor(),
                    flat:true,
                    onChange:function (hsb, hex, rgb) {
                        sliderColorChange.call(that, that.convertColor(hsb, hex, rgb));
                    },
                    onChanging:function (hsb, hex, rgb) {
                        sliderColorChanging.call(that, that.convertColor(hsb, hex, rgb));
                    }
                };
            },
            colorPalletViewModel: function(){
                return this._colorPalletModel;
            },
            setSliders: function(sliders, direction){
                var that = this;
                this.selectedSlider = null;
                hideTooltip.call(this);
                this.sliders.removeAll();
                //Parse sliders
                var firstSlider;

                each(sliders, function(_slider){
                    var sl = new slider({backgroundColor:_slider[1], selected:false, position: toPosition.call(that, _slider[0])});
                    if(!firstSlider)
                        firstSlider = sl;
                    that.sliders.push(sl);
                });

                //select first slider and set its options
                clickSlider.call(this, firstSlider);

                this.setDirection(direction);
            },
            setDirection: function(direction){
                var that = this;
                each(this.directionIcons(), function(di){
                    if(di.direction == direction)
                        that.selectDirection(di)
                });
            },
            sliderClick: function(data, event){
                clickSlider.call(this, data, event)
            },
            removeAllSliders: function(){
                removeAllSliders.call(this);
            },
            fireEvents: function(isChanging, isChanged){
                this.firedEvents = {isChanging:isChanging, isChanged:isChanged};
            },
            clearEvents: function(){
                this.firedEvents = {isChanging:false, isChanged:false};
            },
            draggableOptions:function () {
                var that = this;
                return {
                    axis:"x",
                    containment:".sliderholders",
                    start:function (event, ui) {
                        that._sliderDragY = event.clientY;
                        that.numberOfSliders = that.sliders().length; //number of sliders on the gradient right now
                        var data = $(this).data("item");
                        clickSlider.call(that, data);
                    },
                    drag:function (event, ui) {
                        var left = $(this).position().left;
                        if (that._sliderDragY && ( Math.abs(event.clientY - that._sliderDragY) ) > sliderRemoveDistance && that.numberOfSliders > 1) {
                            hideTooltip.call(that);
                            that.selectedSlider.visible(false);
                        } else {
                            var left = $(this).position().left;
                            that.selectedSlider.visible(true); //show slider, if it was invisible
                            that.selectedSlider.position(left);
                            showTooltip.call(that, left);
                        }
                        triggerRedraw.call(that, true, false);
                    },
                    stop:function (event) {
                        //Slider dragged more than sliderRemoveDistance pixels below and user released mouse button. Slider is removed
                        hideTooltip.call(that);

                        if (that._sliderDragY && (Math.abs(event.clientY - that._sliderDragY)) > sliderRemoveDistance && that.numberOfSliders > 1) {
                            var data = $(this).data("item");
                            removeSlider.call(that, data);
                            that.selectedSlider = null;
                        } else {
                            var left = $(this).position().left;
                            that.selectedSlider.position(left);
                        }
                        this._sliderDragY = null;
                        triggerRedraw.call(that, false, true);
                    }
                }
            },
            dispose:function () {
                this.onGradientUpdate.clearSubscribers();
                this.onGradientUpdating.clearSubscribers();
                this.properties.dispose();
            }
        }
    })());
});
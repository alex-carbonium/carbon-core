define(function (){
    klass2("sketch.ui.PreviewAction", null, (function (){
        return {
            execute: function() {
            },
            toJSON: function(){
                var json = {};
                json.t = this.t;
                json.props = {};
                return json;
            },
            fromJSON: function(data){
            }
        }
    })());


    klass2("sketch.ui.SwitchPageAction", sketch.ui.PreviewAction, (function (){
        return {
            _constructor:function(pageId){
                this.pageId = pageId;
            },

            execute: function() {
                var page = App.Current.getPageById(this.pageId);
                if (page){
                    App.Current.setActivePage(page);
                }
            }
        }
    })());

    klass2("sketch.ui.ToggleStateAction", sketch.ui.PreviewAction, (function(){
        return {
            _constructor: function(state){
                this.state = state;
            },

            execute: function(element){
                if (!element.props.state){
                    return;
                }
                var currentState = element.props.state;
                if (currentState !== this.state){
                    element.__previousState = currentState;
                    //element.properties.state.value(this.state);
                }
                else {
                    var previousState = element.__previousState || "default";
                    //element.properties.state.value(previousState);
                }
            },
            toJSON: function(){
                var data = sketch.ui.PreviewAction.prototype.toJSON.apply(this, arguments);
                data.props.state = this.state;
                return data;
            },
            fromJSON: function(data){
                sketch.ui.PreviewAction.prototype.fromJSON.apply(this, arguments);
                this.state = data.props.state;
            }
        }
    })());

    klass2("sketch.ui.TogglePropertyAction", sketch.ui.PreviewAction, (function(){
        return {
            _constructor: function(propertyName){
                this._propertyName = propertyName;
            },

            execute: function(element){
                var property = element.props[this._propertyName];
                if (!property){
                    return;
                }
                property.value(!property.value());
            },
            toJSON: function(){
                var data = sketch.ui.PreviewAction.prototype.toJSON.apply(this, arguments);
                data.props.propertyName = this._propertyName;
                return data;
            },
            fromJSON: function(data){
                sketch.ui.PreviewAction.prototype.fromJSON.apply(this, arguments);
                this._propertyName = data.props.propertyName;
            }
        }
    })());
});

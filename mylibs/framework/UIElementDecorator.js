define(function(){
	var fwk = sketch.framework;
 	return klass2("sketch.framework.UIElementDecorator", null, {
 		_constructor:function(){
 			this.element = null;
 			this._visible = true;
		},
		attach : function(element){
	 		this.element = element;
		},
        addDecorator:function(){
        },		
	 	detach : function(){
            this.element = null;
	 	},
        draw : function(context){
        },
        parent:function(value){
        },
        visible:function(value){
        	if (arguments.length === 1){
        		this._visible = value;
			}
            return this._visible;
        }
 	});
});
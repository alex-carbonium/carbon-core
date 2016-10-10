define(["./SmartTag"], function(SmartTag){
    return klass2("sketch.framework.smarttags.LinkTag", SmartTag, (function(){

        return {
            _constructor:function(element){
                this._element = element;
                this.template('smarttags_linkTag');
            },
            click:function(){
                App.Current.propertyDesigner.showQuickEditor(this._element.props.pageLink, this._element);
            }

        }
    })())

});

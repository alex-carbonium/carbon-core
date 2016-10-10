define([], function() {
    var fwk = sketch.framework;

    

    return klass2("sketch.projects.Theme", null, {
        _constructor:function(theme){
            this._theme = theme;
            this._updateAppTheme = true;
            this._setSystemColors = true;
            this._recreateStyles = true;
        },
        applyTheme:function(app, callback){
            this._app = app;
            if (this._recreateStyles){
                // fwk.StyleManager.Instance.clear();
            }
            // for(var type in this._theme.styleFor){
            //     if (!fwk.StyleManager.Instance.styleFor(type)){
            //         fwk.StyleManager.Instance.styleFor(type, this.getStyle(type));
            //     }
            // }

            loadResources.call(this, callback);
        },
        getStyleByName: function(styleName){
            return this._theme.styles[styleName];
        },
        getStyle: function(type) {
            return this._theme.styles[this._theme.styleFor[type]];
        }
    });
});
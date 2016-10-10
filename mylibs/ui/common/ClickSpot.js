define(["framework/UIElement", "framework/Resources", "framework/PropertyMetadata"], function(UIElement, Resources, PropertyMetadata) {

    PropertyMetadata.extend("sketch.framework.UIElement", {
          "sketch.ui.common.ClickSpot": {


          }
        });

    return klass2("sketch.ui.common.ClickSpot", UIElement, {
        _constructor: function() {

            this.setProps({
                width: 64,
                height: 64
            });
            this.quickEditProperty( "pageLink");

            //this.properties.removePropertyByName("backgroundBrush");
            //this.properties.removePropertyByName("borderBrush");
            //this.properties.removePropertyByName("borderWidth");

        },
        drawSelf: function(context, w, h, environment){
            if(App.Current.activePage && App.Current.activePage.preview()) //zone shouldn't be visible in preview mode
                return;
            var x = 0;
            var y = 0;
            var x2 = x+w, y2 = y+h;

            context.save();
            var pattern = context.createPattern(Resources['empty_view'], "repeat");
            context.fillStyle = pattern;
            context.globalAlpha = 0.1;
            context.fillRect(x, y, w, h);

            context.globalAlpha = 1;
            context.strokeStyle = "#000000";
            context.beginPath();
            context.setLineDash([3, 5]);
            context.rect(0,0, w, h);
            context.stroke();

            context.restore();

            UIElement.prototype.drawSelf.apply(this, arguments);
        }
    });
});
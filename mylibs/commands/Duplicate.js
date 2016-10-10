import CompositeCommand from "../framework/commands/CompositeCommand";

define(["framework/commands/Command", "framework/sync/Primitive"], function(Command){
    var fwk = sketch.framework;
    return sketch.commands.Duplicate = {
        create:function(selection, doNotMoveElements){
            var offset = doNotMoveElements ? 0 : 10;
            return sketch.commands.Duplicate.createWithMove(selection, "both", offset);
        },
        createWithMove:function(selection, direction, offset){
            offset = offset===undefined?5:offset;
            var xoffset = 0, yoffset = 0;
            switch (direction) {
                case "up":
                    yoffset = -offset;
                    break;
                case "down":
                    yoffset = offset;
                    break;
                case "left":
                    xoffset = -offset;
                    break;
                case "right":
                    xoffset = offset;
                    break;
                case "both":
                    xoffset = offset;
                    yoffset = offset;
                    break;
            }

            for(var i = 0; i < selection.length; ++i) {
                var element = selection[i];
                var clone = element.clone();
                clone.x(element.x() + xoffset);
                clone.y(element.y() + yoffset);

                element.parent().add(clone);
            }
        }
    }

});
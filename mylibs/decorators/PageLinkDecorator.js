// define(function(){
// 	// using
// 	var dec = sketch.decorators,
// 		fwk = sketch.framework;
//
//     var STROKES = ["rgba(255, 255, 255, .5)", "rgba(45, 147, 248, .5)"];
//     var RADIUS = 15 + STROKES.length;
//
//     return klass2("sketch.decorators.PageLinkDecorator", fwk.UIElementDecorator, {
//         _constructor:function(){
//  	    },
//         draw : function(context){
//             var x = ~~(this.element.x() + this.element.width()/2),
//                 y = ~~(this.element.y() + this.element.height()/2),
//                 scale = this.element.view().scale(),
//                 scaleFactor = scale >= 1 ? scale : 1;
//
//             context.save();
//             context.scale(1/scaleFactor, 1/scaleFactor);
//
//             var radius = RADIUS;
//             for (var i = 0; i < STROKES.length; i++) {
//                 context.circle(~~(x * scaleFactor), ~~(y * scaleFactor), radius--);
//                 context.fillStyle = STROKES[i];
//                 context.fill();
//             }
//
//             context.restore();
//         }
//     });
// });
import SystemConfiguration from "SystemConfiguration";
import Selection from "framework/SelectionModel";
import Invalidate from "framework/Invalidate";

define(["ui/common/EditModeAction", "ui/common/Path"], function(EditModeAction, Path){
    var fwk = sketch.framework;

    return klass(EditModeAction, (function(){

        var Line = function(p1, p2){
            return {
                a:p1.y - p2.y,
                b:p2.x - p1.x,
                c:p1.x*p2.y - p1.y*p2.x
            };
        };

        var PerpendicularDistance = function(p, l){
            return Math.abs(l.a* p.x+l.b* p.y + l.c)/Math.sqrt(l.a* l.a + l.b* l.b);
        };

        // removes unnecessary points
        function DouglasPeucker (PointList, epsilon){
            //Find the point with the maximum distance

            var dmax = 0;
            var index = 0;
            if(PointList.length <= 2){
                return PointList;
            }
            var line = Line(PointList[0], PointList[PointList.length-1]);
            for(var i = 1; i < PointList.length-1; ++i){
                var d = PerpendicularDistance(PointList[i], line);
                if(d > dmax){
                    index = i;
                    dmax = d;
                }
            }

            //If max distance is greater than epsilon, recursively simplify
            if(dmax >= epsilon) {
                //Recursive call
                var recResults1 = DouglasPeucker(PointList.slice(0, index+1), epsilon);
                var recResults2 = DouglasPeucker(PointList.slice(index, PointList.length), epsilon);

                // Build the result list
                var ResultList = recResults1.concat(recResults2.slice(1, recResults2.length));
            }
            else {
                ResultList = [PointList[0], PointList[PointList.length-1]];
            }

            //Return the result
            return ResultList;
        };


        return {
            _constructor:function (app) {
                this._app = app;
                this.points = [];
                this._attachMode = "select";
                this._detachMode = "resize";
            },
            mousedown: function(event){
                this._mousepressed = true;
                this.points.push({x:event.x, y:event.y});
                event.handled = true;
                return false;
            },
            mouseup: function(event){
                this._mousepressed = false;
                event.handled = true;
                var view = this.view();
                var scale = view.scale();

                var element = new Path();
                App.Current.activePage.nameProvider.assignNewName(element);
                var defaultSettings = App.Current.defaultShapeSettings();
                if (defaultSettings) {
                    element.setProps(defaultSettings);
                }

                var points = DouglasPeucker(this.points, 1.5 / scale);

                element.addPoint(points[0]);

                for (var i = 1; i<points.length-1; ++i){
                    // build Bezier helper points for smoothing
                    var p1 = points[i-1];
                    var p2 = points[i+1];
                    var p = points[i];

                    element.addPoint(Path.smoothPoint(p, p1, p2, 3 / scale));
                }
                element.addPoint(points[points.length-1]);

                element.adjustBoundaries();
                Invalidate.requestUpperOnly();

                if(points.length > 1){
                    App.Current.activePage.dropToPage(element.x(), element.y(), element);
                }
                Selection.makeSelection([element]);
                this.points=[];
                if(SystemConfiguration.ResetActiveToolToDefault) {
                    App.Current.actionManager.invoke("movePointer");
                }
            },
            mousemove: function(event){
                if(this._mousepressed){
                    var x = event.x
                        , y = event.y;
                    this.points.push({x:x, y:y});
                    Invalidate.requestUpperOnly();
                    event.handled = true;
                }
            },
            layerdraw: function(context){
                if(this._mousepressed){
                    context.save();
                    var pt = this.points[0];
                    context.beginPath();
                    context.fillStyle = "black";
                    context.moveTo(pt.x, pt.y);
                    for(var i = 1; i<this.points.length; ++i){
                        pt = this.points[i];
                        context.lineTo(pt.x, pt.y);
                    }
                    context.stroke();
                    context.restore();
                }
            }
        }
    })());
});
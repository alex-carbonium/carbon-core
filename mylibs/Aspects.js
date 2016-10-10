define(function(){
    if (Config.ENABLE_ASPECTS){
        sketch.aspects = {};
        sketch.aspects._store = {};

        sketch.aspects.createPointCut = function(type, method){
            return type + "." + method;
        }
        sketch.aspects.register = function(type, method, aspect){
            var pointCut = sketch.aspects.createPointCut(type, method);
            var entry = sketch.aspects._store[pointCut];
            if (!entry){
                entry = [];
                sketch.aspects._store[pointCut] = entry;
            }
            entry.push(aspect);
        };
        sketch.aspects.unregister = function(type, method, aspect){
            var pointCut = sketch.aspects.createPointCut(type, method);
            var entry = sketch.aspects._store[pointCut];
            if (entry){
                var index;
                each(entry, function(a, i){
                    if (a === aspect){
                        index = i;
                        return false;
                    }
                });
                if (index !== undefined){
                    entry.splice(index, 1);
                }
            }
        };
        sketch.aspects.unregisterAll = function(){
            sketch.aspects._store = {};
        };
        sketch.aspects.findAspects = function(type, method){
            var pointCut = sketch.aspects.createPointCut(type, method);
            return sketch.aspects._store[pointCut];
        };

        sketch.aspects.wrap = function(funcName, func){
            return function(){
                var type = this.__type__;
                var aspects = [];
                while (type){
                    var typeAspects = sketch.aspects.findAspects(type, funcName);
                    if (typeAspects){
                        each(typeAspects, function(a){
                            if (aspects.indexOf(a) === -1){
                                aspects.push(a);
                            }
                        });
                    }

                    var t = sketch.types[type];
                    type = t ? t.parentType : null;
                }

                var callOriginal = true;
                var originalArgs = [].splice.call(arguments, 0);

                if (aspects){
                    var args = [this];
                    args = args.concat(originalArgs);
                    each(aspects, function(a){
                        if (a.before){
                            a.before.apply(a, args);
                        }

                        if (a.instead){
                            a.instead.apply(a, args);
                            callOriginal = false;
                        }
                    })
                }

                var result;
                if (callOriginal){
                    result = func.apply(this, originalArgs);
                }

                if (aspects){
                    var args = [this, result];
                    args = args.concat(originalArgs);
                    each(aspects, function(a){
                        if (a.after){
                            a.after.apply(a, args);
                        }
                    })
                }

                return result;
            };
        };

        sketch.aspects.PerfTimer = function(){
            this.before = function(obj, args){
                this._startTime = new Date();
            };
            this.after = function(obj, result, args){
                this._elapsed = new Date() - this._startTime;
            };
            this.getElapsedMilliseconds = function(){
                return this._elapsed;
            };
        };
        sketch.aspects.Counter = function(){
            this._counter = 0;
            this.before = function(obj, args){
                ++this._counter;
            };
            this.after = function(obj, result, args){
            };
            this.count = function(){
                return this._counter;
            };
        };
        sketch.aspects.TypeUsageReport = function(){
            this.elements = [];
            this.after = function(obj, result, args){
                this.elements.push(obj);
            };
            this.print = function(){
                var byType = sketch.util.groupByAndCount(this.elements, function(e){
                    return e.__type__;
                });

                return byType.join("\n")
                    + "\n"
                    + "Total: " + this.elements.length;
            };
        };
        sketch.aspects.BagUsageReport = function(){
            this.bags = [];
            this.after = function(obj, result, args){
                this.bags.push(obj);
            };
            this.print = function(){
                var byType = sketch.util.groupByAndCount(this.bags, function(e){
                    return e.toString();
                });

                return byType.join("\n")
                    + "\n"
                    + "Total: " + this.bags.length;
            };
        };
        sketch.aspects.PropertyUsageReport = function(){
            this.props = [];
            this.after = function(obj, result, args){
                this.props.push(result);
            };
            this.printByType = function(){
                var byType = sketch.util.groupByAndCount(this.props, function(p){
                    var owner = p.getOwner();
                    return owner ? owner.__type__ : "unknown";
                });

                return "Owning type,Count" + "\n"
                    + byType.join("\n") + "\n\n"
                    + "Total: " + this.props.length;
            };
            this.printByUniqueName = function(){
                var byUniqueName = sketch.util.groupByAndCount(this.props, function(p){
                    return p.getUniqueName();
                });

                return "Unique name,Count" + "\n"
                    + byUniqueName.join("\n") + "\n\n"
                    + "Total: " + this.props.length;
            };
        };
        sketch.aspects.PropertyUsageReport.Instance = new sketch.aspects.PropertyUsageReport();
        sketch.aspects.TypeUsageReport.Instance = new sketch.aspects.TypeUsageReport();
        sketch.aspects.BagUsageReport.Instance = new sketch.aspects.BagUsageReport();

        sketch.aspects.register("sketch.framework.Brush", "_constructor", sketch.aspects.BagUsageReport.Instance);
        sketch.aspects.register("sketch.framework.Stroke", "_constructor", sketch.aspects.BagUsageReport.Instance);
        sketch.aspects.register("sketch.framework.Font", "_constructor", sketch.aspects.BagUsageReport.Instance);
        sketch.aspects.register("Box", "_constructor", sketch.aspects.BagUsageReport.Instance);
        sketch.aspects.register("sketch.framework.QuadAndLock", "_constructor", sketch.aspects.BagUsageReport.Instance);
        sketch.aspects.register("sketch.framework.Properties", "createProperty", sketch.aspects.PropertyUsageReport.Instance);
        sketch.aspects.register("sketch.framework.UIElement", "_constructor", sketch.aspects.TypeUsageReport.Instance);
    }
});
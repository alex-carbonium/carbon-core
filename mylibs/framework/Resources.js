import {createUUID} from "../util";

define(["projects/Metadata", "framework/EventHelper"], function(ProjectsMetadata, EventHelper) {
    var fwk = sketch.framework;

    var resourceTotalCount;
    var resourceCompletedCount;
    var gradients;
    var systemResources;
    var userTemplateStore;
    var systemTemplateStore;
    var systemTemplateCache = {};
    var systemPalette;
    var userPalette;

    function clear(){
        resourceTotalCount = 0;
        resourceCompletedCount = 0;
        gradients = [];
        systemResources = [];
        systemPalette = [];
        userPalette = [];
        userTemplateStore = {};
        systemTemplateStore = {};
    }

    clear();

    fwk.Resources = {
        starting:EventHelper.createEvent(),
        completed:EventHelper.createEvent(),
        modified: EventHelper.createEvent(),
        userTemplateAdded: EventHelper.createEvent(),
        userTemplateRemoved: EventHelper.createEvent(),
        reportProgress:function(event){
        }
    };

    function startLoading(){
        if (resourceTotalCount === 0){
            fwk.Resources.starting.raise();
        }
        resourceTotalCount++;
    }

    function completeLoading(){
        resourceCompletedCount ++;
        fwk.Resources.reportProgress({loaded:resourceCompletedCount, count:resourceTotalCount});
        if(resourceCompletedCount === resourceTotalCount){
            fwk.Resources.completed.raise();
        }
    }

    fwk.Resources.startLoading = startLoading;
    fwk.Resources.completeLoading = completeLoading;

    function templatesToJSON(){
        var result = {};
        for (var i in userTemplateStore){
            var template = userTemplateStore[i];
            result[i] = template.toJSON();
        }
        return result;
    }

    function templatesFromJSON(json){
        for (var i in json){
            var existing = userTemplateStore[i];
            if (existing){
                existing.fromJSON(json[i]);
                existing.updated.raise();
            }
            else {
                var template = fwk.UIElement.fromJSON(json[i]);
                fwk.Resources.registerTemplate(template);
            }
        }
    }

    function palletToJSON(){
        var data = [];
        for(var i = 0; i < userPalette.length; ++ i){
            if(userPalette[i]){
                data.push({color:userPalette[i], index:i});
            }
        }

        return data;
    }

    function palletFromJSON(data){
        userPalette = [];
        if(data){
            each(data, function(item){
                userPalette[item.index] = item.color;
            });
        }
    }

    function templateChanged(template){     // TODO: resolve
        fwk.Resources.modified.raise(template);
    }
    function bindTemplate(template){
        template.updated.bind(function(){
            templateChanged(template);
        });
    }

    function unbindTemplate(template){
        template.updated.unbind(templateChanged);
    }

    function loadImage(resourceName, url, fireCallbacks, onLoaded){
        var dfd = fwk.Deferred.create();
        var img = new Image();
        img.crossOrigin = "Anonymous";
        if (fireCallbacks){
            startLoading();
        }
        img.onload = function(){
            fwk.Resources[resourceName] = img;
            fwk.Resources[url] = img;
            if (fireCallbacks){
                completeLoading();
            }
            if (onLoaded){
                onLoaded();
            }
            dfd.resolve(resourceName);
        };
        img.onerror = function(){
            dfd.reject(resourceName);
            throw 'Image not found URL: ' + url + '(' + resourceName + ')';
        };
        img.setSource(url);
        return dfd.promise();
    }

    var resourcePrefixes;
    function getResourcePrefixes(){
        if (!resourcePrefixes){
            var metadata = ProjectsMetadata.projects[sketch.params.projectType];
            resourcePrefixes = metadata.resourcePrefixes || [];
        }
        return resourcePrefixes;
    }

    fwk.Resources.loadImage = function loadImage_s(/*string*/resourceName, /*URI*/url) {
        return loadImage(resourceName, url, true);
    };
    fwk.Resources.addImage = function addImage_s(/*string*/resourceName, /*URI*/url, onLoaded){
        return loadImage(resourceName, url, false, onLoaded);
    };

    fwk.Resources.loadTemplate = function loadTemplage_s(/*string*/resourceName, /*URI*/url){
        startLoading();
        $.ajax(url, {
            success:function(data){
                $("#templatesHolder").append(data);
                fwk.Resources[resourceName] = data;

                completeLoading();
            },
            error:function(jqXHR, textStatus, errorThrown){
                throw errorThrown;
            }
        });
    };

    fwk.Resources.loadTemplates = function loadTemplates_s(){
        startLoading();
        $("[data-template-id]").each(function(){
            fwk.Resources[$(this).attr("data-template-id")] = this;
        });
        completeLoading();
    };

    fwk.Resources.loadJson = function loadJson_s(url, callback){
        startLoading();
        $.ajax(url, {
            success: function(data){
                callback(data);
                completeLoading();
            },
            error: function(jqXHR, textStatus, errorThrown){
                throw errorThrown;
            }
        });
    };

    // TODO: remove
    fwk.Resources.loadGradientFromPoints = function(category, resourceName, points){
        fwk.Resources.addSystemResource(resourceName, category, fwk.Brush.createFromGradientPoints({sliders:points}));
    };

    fwk.Resources.getGradients = function(){
        return gradients;
    };

    fwk.Resources.addSystemResource = function(resourceId, friendlyName, value) {
        var resource = {name:friendlyName, id:resourceId,  value:value};
        systemResources.push(resource);
        fwk.Resources[resourceId] = resource;
    };

    fwk.Resources.setSystemColor = function(color, index){
        systemPalette[index] = color;
    };

    fwk.Resources.setUserColor = function(color, index){
        userPalette[index] = color;
        fwk.Resources.modified.raise();
    };

    fwk.Resources.getSystemResources = function() {
        return systemResources;
    };

    fwk.Resources.getSystemResource = function(resourceId){
        var resource = fwk.Resources[resourceId];
        if (!resource){
            var possiblePrefixes = getResourcePrefixes();
            for (var i = 0, l = possiblePrefixes.length; i < l; ++i){
                var prefix = possiblePrefixes[i];
                resource = fwk.Resources[prefix + resourceId];
                if (resource){
                    break;
                }
            }
        }
        return resource;
    };

    fwk.Resources.createTemplate = function(templateId){
        var template = new fwk.Template();
        var id = templateId || createUUID();
        template.setTemplateId(id);
        userTemplateStore[id] = template;

        bindTemplate(template);
        fwk.Resources.userTemplateAdded.raise(template);

        return template;
    };

    fwk.Resources.createSystemTemplate = function(id){
        var template = new fwk.Template();
        template.setTemplateId(id);
        systemTemplateStore[id] = template;
        if(DEBUG) { // when designing templates we need to remove user templates when system one exists
            fwk.Resources.removeTemplate(id);
        }
        return template;
    };

    fwk.Resources.createSystemTemplateFromJson = function(json){
        systemTemplateCache[json.props.templateId] = json;
    };

    fwk.Resources.createSystemTemplateFromData = function(data){
        var template = new fwk.Template();
        var id = data.props.templateId;
        template.fromJSON(data);
        systemTemplateStore[id] = template;
        return template;
    };
    fwk.Resources.removeTemplate = function(template){
        unbindTemplate(template);
        delete userTemplateStore[template.templateId()];
        fwk.Resources.userTemplateRemoved.raise(template);
    };
    fwk.Resources.getTemplate = function(templateId){
        var res = userTemplateStore[templateId];
        if(!res){
            res = systemTemplateStore[templateId];
        }
        if(!res){
            var json = systemTemplateCache[templateId];
            if(json) {
                res = new fwk.Template();
                //res.setTemplateId(json.properties.templateId);
                res.fromJSON(json);
                systemTemplateStore[json.props.templateId] = res;
                delete systemTemplateCache[templateId];
            }
        }

        return res;
    };
    fwk.Resources.registerTemplate = function(template){
        if (!userTemplateStore[template.templateId()]){
            bindTemplate(template);
            userTemplateStore[template.templateId()] = template;
            fwk.Resources.userTemplateAdded.raise(template);
        }
    };
    fwk.Resources.updateTemplateId = function(oldId, newId){
        var template = fwk.Resources.getTemplate(oldId);
        template.setTemplateId(newId);
        if (userTemplateStore[oldId]){
            userTemplateStore[newId] = template;
            delete userTemplateStore[oldId];
        }
        else if (systemTemplateStore[oldId]){
            systemTemplateStore[newId] = template;
        }
        //all elements should be updated with new ID
        template.raiseUpdated();
    };
    fwk.Resources.foreachTemplate = function(callback){
        for (var i in userTemplateStore){
            var template = userTemplateStore[i];
            callback(template);
        }
    };
    fwk.Resources.foreachSystemTemplate = function(callback){
        for (var i in systemTemplateStore){
            var template = systemTemplateStore[i];
            callback(template);
        }
    };
    fwk.Resources.systemTemplateCache = function(value){
        if (arguments.length === 1){
            systemTemplateCache = value;
        }
        return systemTemplateCache;
    };
    fwk.Resources.fromJSON = function(json){
        if (json){
            templatesFromJSON(json.templates);
            palletFromJSON(json.colorPallet);
        }
    };
    fwk.Resources.toJSON = function(){
        return {
            templates: templatesToJSON(),
            colorPallet:palletToJSON()
        };
    };
    fwk.Resources.clear = function(){
        clear();
    };
    fwk.Resources.getColorPalette = function(){
        var pallet = systemPalette.slice(0);
        for(var i = 0; i < userPalette.length; ++i){
            if(userPalette[i]){
                pallet[i] = userPalette[i];
            }
        }

        return pallet;
    };

    fwk.Resources.addImageToCache = function(url, image){
        fwk.Resources[url] = image;
        fwk.Resources.modified.raise({type: "imageAddedToCache", url: url, image: image});
    };
    fwk.Resources.removeImageFromCache = function(url){
        delete fwk.Resources[url];
        fwk.Resources.modified.raise({type: "imageRemovedFromCache", url: url});
    };

    return fwk.Resources;
});

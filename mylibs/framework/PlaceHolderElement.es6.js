import Container from   "./Container";
import Primitive from "framework/sync/Primitive";
import Command from "./commands/Command";
import UIElement from "framework/UIElement";
import Deferred from "framework/Deferred";
import NullContainer from "framework/NullContainer";
import ImageSource from "framework/ImageSource";
import Icon from "ui/common/Icon";
import Image from "ui/common/Image";
import Frame from "./Frame";
import FrameSource from "./FrameSource";
import IconsInfo from "ui/IconsInfo";
import Resources from "framework/Resources";
import TemplatedElement from "framework/TemplatedElement";
import {createUUID} from "../util";
import {ChangeMode} from "./Defs";
import Selection from "framework/SelectionModel"

var fwk = sketch.framework;
var templatePromiseCache = {};
var templateConfigCache = {}

function elementObtained(element){
    if (this.isDisposed() || this._resolved){
        return;
    }
    this._resolved = true;
    this.backgroundBrush(fwk.Brush.None);
    this.clear();
    var rect = this.getBoundaryRect();
    rect.x = 0;
    rect.y = 0;
    element.resize(rect);
    element.name("");
    this.add(element);
    this._element = element;
    if(element.performArrange) {
        element.performArrange();
    }

    //var parent = this.parent();
    //if (parent && parent !== NullContainer.instance && this.autoReplace()){
    //    this.replace(parent);
    //}
    //this.view().invalidate();
}

var PlaceholderElement = klass2("PlaceholderElement", Container, {
    initFromTemplate: function(templateType, templateId, testDelay){
        //if (elementPromise){ //otherwise initialized from json
        //    this.promise(elementPromise);
        //}
        //this._resolved = false;
        //this.backgroundBrush(fwk.Brush.createFromColor("red"));
        var {promise, templateConfig} = templatePromiseCache[templateId]||{};
        var element = null;

        if(!promise) {
            switch (templateType) {
                case "recentElement":
                    templateConfig = window.richApp.recentStencilsStore.findById(templateId);
                    element = UIElement.fromJSON(templateConfig.json);
                    promise = Deferred.createResolvedPromise(element);
                    break;
                case "recentIcon":
                    templateConfig = window.richApp.recentIconsStore.findById(templateId);
                    element = UIElement.fromJSON(templateConfig.json);
                    promise = Deferred.createResolvedPromise(element);
                    break;
                case "icon":
                    templateConfig = {
                        realWidth: 30,
                        realHeight: 30
                    };
                    //element = new Icon();
                    //element.setProps({width: templateConfig.realWidth, height: templateConfig.realHeight});
                    //element.source(ImageSource.createFromFont(IconsInfo.defaultFontFamily, templateId));
                    element = new Frame();
                    element.setProps({width: 200, height: 200, source: FrameSource.createFromUrl("/target/res/toolbox/web.png")});
                    promise = Deferred.createResolvedPromise(element);
                    //richApp.dispatch(SketchActions.elementUsed(element));
                    break;
                case "iconFinderIcon":
                    templateConfig = window.richApp.iconFinderStore.findById(templateId);
                    element = new Icon();
                    element.setProps({width: templateConfig.realWidth, height: templateConfig.realHeight});
                    ImageSource.createFromUrlAsync(templateId).then(function (source) {
                        element.setProps({source: source});
                    });

                    promise = Deferred.createResolvedPromise(element);
                    //richApp.dispatch(SketchActions.elementUsed(element));
                    break;
                case "userImage":
                    templateConfig = window.richApp.userImagesStore.findById(templateId);
                    element = new Frame();
                    element.setProps({width: templateConfig.realWidth, height: templateConfig.realHeight,
                        source: FrameSource.createFromUrl(templateConfig.url)});

                    promise = Deferred.createResolvedPromise(element);
                    //richApp.dispatch(SketchActions.elementUsed(element));
                    break;
                case "recentImage":
                    templateConfig = window.richApp.recentImagesStore.findById(templateId);
                    element = UIElement.fromJSON(templateConfig.json);
                    promise = Deferred.createResolvedPromise(element);
                    break;
                default:
                    templateConfig = this._findTemplateConfig(templateId);
                    promise = this.loadTemplate(templateId).then(()=> {
                        console.log("Template loaded: " + templateId);
                        let element = this.createElement(templateId);
                        if (DEBUG && testDelay) {
                            return Deferred.delay(element, 10000).then(function (data) {
                                return data;
                            });
                        }
                        //richApp.dispatch(SketchActions.elementUsed(element));
                        return element;
                    }).fail(e=>alert(e));
                    break;
            }
            //templatePromiseCache[templateId] = {promise, templateConfig};
        }
        this.id(null);
        this.width(templateConfig.realWidth);
        this.height(templateConfig.realHeight);
        this.autoPosition(templateConfig.autoPosition);

        promise.then(elementObtained.bind(this));
    },
    propsUpdated:function(props) {
        Container.prototype.propsUpdated.apply(this, arguments);
        if(props.templateId) {
            this.initFromTemplate(props.templateType, props.templateId, props.testDelay);
        }
    },
    toJSON:function(){
        return UIElement.prototype.toJSON.apply(this, arguments);
    },
    autoReplace: function(value){
        return this.field("_autoReplace", value, true);
    },
    replace: function(parent){
        if (this._resolved){
            var element = this.peek();
            element.setProps(this.getBoundaryRect(), ChangeMode.Root);
            element.setProps({
                id:createUUID()
            }, true);

            var index = this.zOrder();
            // we need to manually remove element from placeholder, otherwise we will get chnageOrder event instead of insert
            element.parent().remove(element, ChangeMode.Root);

            this.parent().insert(element, index);
            this.parent().remove(this, ChangeMode.Root);
            var selectedElement = Selection.selectedElement();
            if(selectedElement && selectedElement.id() === element.id()){
                Selection.makeSelection([element]);
            }
        }
    },
    peek: function(){
        return this._resolved ? this._element : this;
    },
    createElement:function(templateId){
        var template = Resources.getTemplate(templateId);
        var element = TemplatedElement.createFromTemplate(template);
        if (element.compositeElement()){
            var children = element.getChildren();
            if (children.length !== 1){
                throw "Can't create composite without single root element";
            }
            var clone = children[0].clone();
            
            clone.name("");
            return clone;
        }
        element.name("");
        return element;
    },
    loadTemplate:function(templateId){
        var template = Resources.getTemplate(templateId);
        if (template){
            return Deferred.createResolvedPromise(template);
        }

        var config = this._findTemplateConfig(templateId);
        if (config){
            return this.app.loadSatelliteProjects([this.state.currentProject.projectType])
                .then(() => window.richApp.stencilsQueries.getTemplates(this.state.currentProject.projectType))
                .then(data => this.importTemplates(data));
        }

        return Deferred.createRejectedPromise(new Error("Could not load template " + templateId));
    },
    _findTemplateConfig:function(templateId){
        var template = templateConfigCache[templateId];
        if (!template){
            template = this._findTemplateConfigInProjectConfig(templateId, richApp.toolbox.state.currentProject);
        }
        if (!template){
            template = this._findTemplateConfigInProjectConfig(templateId, richApp.userStencilsStore.getCurrentConfig());
        }
        return template;
    },
    _findTemplateConfigInProjectConfig:function(templateId, projectConfig){
        for (var i = 0; i < projectConfig.groups.length; i++){
            var group = projectConfig.groups[i];
            for (var j = 0; j < group.templates.length; j++){
                var template = group.templates[j];
                if (template.id === templateId){
                    templateConfigCache[templateId] = template;
                    return template;
                }
            }
        }
        return null;
    },
    parent: function(parent){
        var firstRealParent = Container.prototype.parent.call(this) === NullContainer
            && parent !== NullContainer;
        var res = Container.prototype.parent.apply(this, arguments);
        if (arguments.length === 1 && this._resolved && firstRealParent){
            setTimeout(()=>{
                this.replace(parent);
            },0)
        }

        return res;
    },
    move: function (rect){
        var element = this.peek();
        element.resize(rect);
        if(element !== this){
            this.resize(rect);
        }
    }
    
})


fwk.PropertyMetadata.registerForType(PlaceholderElement, {
});

export default PlaceholderElement;

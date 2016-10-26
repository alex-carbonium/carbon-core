import CompositeCommand from "../framework/commands/CompositeCommand";
import {createUUID} from "../util";
import Selection from "framework/SelectionModel"

define(["framework/commands/CommandManager", "server/ContentProxy", "projects/Metadata", "commands/Paste"], function(commandManager, ContentProxy, ProjectsMetadata){
    var fwk = sketch.framework;

    return klass((function(){
        //FireFox does not support custom mime types or pasting something like application/json.
        //IE has his own mime types and it properly supports only "text".
        //So the only reliable cross-browser solution is to use plain text.
        var MIME_TYPES = ["text/plain", "text"];
        var SOURCE = "carb";

        function getOriginalEvent(e){
            while (e.originalEvent){
                e = e.originalEvent;
            }
            return e;
        }
        function getClipboardData(e){
            return e.clipboardData || (window && window.clipboardData);
        }

        function loadSatelliteProjectsIfNeeded(data){
            var projectNames = [];
            for (var i = 0, l = data.elements.length; i < l; ++i){
                var json = data.elements[i];
                var names = ProjectsMetadata.determineProjects(json);
                projectNames = projectNames.concat(names);
            }
            for (var i = 0, l = data.projects.length; i < l; ++i){
                projectNames.push(data.projects[i]);
            }
            projectNames = sketch.util.distinct(projectNames);
            return this._app.loadSatelliteProjects(projectNames);
        }
        function prepareUserTemplates(elements){
            var templates = {};
            for (var i = 0, l = elements.length; i < l; ++i){
                var e = elements[i];
                e.applyVisitor(function(c){
                    // if (c instanceof fwk.TemplatedElement){
                    //     var template = c.getTemplate();
                    //     if (!template.system() && !templates[template.templateId()]){
                    //         templates[template.templateId()] = template;
                    //     }
                    // }
                });
            }
            var result = [];
            for (var i in templates){
                var template = templates[i];
                if (template.hasNonUniqueId()){
                    fwk.Resources.updateTemplateId(template.templateId(), createUUID());
                }
                result.push(template.toJSON(true));
            }
            return result;
        }
        function transferUserTemplates(userTemplates){
            for (var i = 0, l = userTemplates.length; i < l; ++i){
                var json = userTemplates[i];
                var newTemplate = fwk.Resources.getTemplate(json.props.templateId);
                if (!newTemplate){
                    newTemplate = fwk.Resources.createTemplate(json.props.templateId);
                }
                newTemplate.fromJSON(json);
                newTemplate.raiseUpdated();
            }
        }

        function saveData(types, data, clipboardData){
            for (var i = 0, l = types.length; i < l; ++i){
                var type = types[i];
                try{
                    clipboardData.setData(type, data);
                }
                catch (e){}
            }
        }
        function testMimeTypes(types, clipboardData){
            var result;

            if (clipboardData.items){
                for (var i = 0, l = clipboardData.items.length; i < l; ++i){
                    var item = clipboardData.items[i];
                    if (types.indexOf(item.type) !== -1){
                        if (item.kind === "file"){
                            result = item.getAsFile();
                        }
                        else {
                            result = clipboardData.getData(item.type);
                        }
                        break;
                    }
                }
                return result;
            }

            for (var i = 0, l = types.length; i < l; ++i){
                var type = types[i];
                try{
                    result = clipboardData.getData(type);
                }
                catch(e){}

                if (result){
                    break;
                }
            }

            if (!result && clipboardData.files){
                for (var i = 0, l = clipboardData.files.length; i < l; ++i) {
                    var file = clipboardData.files[i];
                    if (types.indexOf(file.type) !== -1){
                        result = file;
                        break;
                    }
                }
            }

            return result;
        }


        function executeCopy(selection){
            commandManager.execute(new sketch.commands.Copy(selection));
        }
        function executeCut(selection){
            var deleteCommand;
            //TODO: actionManager contains same stuff, refactor
            if (selection.length === 1) {
                deleteCommand = selection[0].constructDeleteCommand();
            }
            else {
                deleteCommand = new CompositeCommand(selection.map(x => x.constructDeleteCommand()));
            }
            var copyCommand = new sketch.commands.Copy(selection);

            commandManager.execute(new CompositeCommand([copyCommand, deleteCommand]));
        }
        function executePaste(){
            commandManager.execute(new sketch.commands.Paste(this._app.activePage));
        }

        function canProcess(e){
            return e.target === this._eventCatcher[0]
                || e.target === this._app.platform.htmlPanel;
        }

        function onCopy(e, cut){
            if (!canProcess.call(this, e)){
                return;
            }
            e.preventDefault();
            e = getOriginalEvent(e);
            var selection = Selection.getSelection();
            if (selection && selection.length){
                if (cut){
                    executeCut.call(this, selection);
                }
                else {
                    executeCopy.call(this, selection);
                }

                var clipboardData = getClipboardData(e);
                if (clipboardData){
                    var projects = this._app.satelliteProjects().slice();
                    projects.push(sketch.params.projectType);
                    var data = {
                        clipboardSource: SOURCE,
                        instanceId: backend.sessionId,
                        projects: projects,
                        userTemplates: prepareUserTemplates(selection),
                        elements: map(selection, function(x) { return x.toJSON(true); })
                    };
                    saveData(MIME_TYPES, JSON.stringify(data), clipboardData);
                }
            }
        }
        function onPaste(e){
            if (!canProcess.call(this, e)){
                return;
            }
            e.preventDefault();
            e = getOriginalEvent(e);

            var clipboardData = getClipboardData(e);
            if (clipboardData){
                var data;
                if (data = testMimeTypes(["image/png", "image/jpg", "image/jpeg", "image/gif"], clipboardData)){
                    pasteImage.call(this, data);
                    return;
                }

                var isCarbData = false;
                if (data = testMimeTypes(MIME_TYPES, clipboardData)){
                    isCarbData = pasteCarbElements.call(this, data);
                }

                if (!isCarbData && (data = testMimeTypes(["text/plain", "text/css"], clipboardData))){
                    pasteText.call(this, data);
                }
            }
        }

        function pasteCarbElements(jsonString){
            var data;
            try{
                data = JSON.parse(jsonString);
            }
            catch(e){
                return false;
            }

            if (data.clipboardSource !== SOURCE){
                return false;
            }

            if (data.instanceId === backend.sessionId){
                executePaste.call(this);
            }
            else {
                var that = this;
                loadSatelliteProjectsIfNeeded.call(this, data).done(function(){
                    transferUserTemplates(data.userTemplates);
                    var elements = [];
                    for (var i = 0, l = data.elements.length; i < l; ++i){
                        elements.push(fwk.UIElement.fromJSON(data.elements[i]));
                    }
                    executeCopy.call(that, elements);
                    executePaste.call(that);
                });
            }
            return true;
        }
        function pasteImage(blob){
            var reader = new FileReader();
            var that = this;
            var notice = notify("info", {title: "Uploading pasted graphics", text: "Transferring...", hide: false, opacity: .8});
            reader.onload = function(e){
                var data = e.target.result;
                var proxy = new ContentProxy();
                proxy.uploadExportedImage(data).then(function(data){
                    fwk.ImageSource.createFromUrlAsync(data.uploadedFileSrc).then(function(source){
                        var image = new sketch.ui.common.Image();
                        image.autoSizeOnFirstLoad(true);
                        image.source(source);
                        executeCopy.call(that, [image]);
                        executePaste.call(that);

                        notice.options.type = "success";
                        notice.options.title = "Pasted graphics is uploaded!";
                        notice.options.text = "Transferring... Done.";
                        notice.options.hide = true;
                        notice.options.delay = 3000;
                        notice.options.opacity = 1;
                        notice.update();
                    });
                });
            };
            reader.readAsDataURL(blob);
        }
        function pasteText(text){
            var element;

            if (text.indexOf("\n") !== -1){
                element = new sketch.ui.common.TextBlock();
                element.setProps({width: 500, height: 300, text: text});
            }
            else{
                element = new sketch.ui.common.Label();
                element.setProps({text: text, scaleWithFontSize: true});
            }

            executeCopy.call(this, [element]);
            executePaste.call(this);
        }

        function setupEventCatcher($htmlPanel){
            //in chrome events sometimes are fired on body even when htmlPanel is active element
            if ($.browser.chrome){
                $htmlPanel.focus(function(){
                    $.clearTextSelection();
                });
                return $("body");
            }

            //FF, Safari and IE do not enable clipboard actions for non-editable content
            var element = $("<div/>")
                .attr({"contenteditable": "true", "tabindex": "1", "id": "clipboardEventCatcher"})
                .text("x")
                .css({
                    position: "absolute",
                    left: "-1000px",
                    "user-select": "auto",
                    "-webkit-user-select": "auto",
                    "-moz-user-select": "auto",
                    "-o-user-select": "auto"
                })
                .appendTo("body");

            $htmlPanel.focus(function(){
                element.selectContents();
            });

            return element;
        }
        function setupFocusWatch($htmlPanel){
            if (!$.browser.chrome){
                //When esc is pressed in a textbox and focus is lost, htmlPanel must be focused
                //for receiving clipboard events.
                //In chrome clipboard events are watched on body
                var that = this;
                $("body").on("focusout", function(){
                    setTimeout(function(){
                        if (document.activeElement === document.body){
                            that._eventCatcher.selectContents();
                        }
                    }, 1);
                });
                this._eventCatcher.selectContents();
            }
        }

        function testNativeSupport(){
            return true;
        }

        return {
            _constructor: function(app){
                var that = this;
                this._app = app;
                var $htmlPanel = $(app.platform.htmlPanel);

                if (testNativeSupport()){
                    app.loaded.then(function(){
                        setupFocusWatch.call(that, $htmlPanel);
                    });

                    this._eventCatcher = setupEventCatcher.call(this, $htmlPanel)
                        .on("copy", proxy(this, onCopy))
                        .on("paste", proxy(this, onPaste))
                        .on("cut", function(e){
                            onCopy.call(that, e, true);
                        });
                }
                else {
                    app.platform.registerClipboardShortcuts();
                }
            },
            paste: pasteCarbElements
        }
    })());
});

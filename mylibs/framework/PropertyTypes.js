define(function(){
    var fwk = sketch.framework;
    var type = function(props){
        return extend({}, {
            defaultValue: null,
            argument:null
        }, props);
    };

    fwk.PropertyTypes = {
        stroke: type({
            label: "Stroke brush",
            editorTemplate: "editor-colorpicker"
        }),
        fill: type({
            label: "Brush",
            editorTemplate: "editor-colorpicker"
        }),
        text: type({
            label: "Text",
            editorTemplate: "editor-textbox"
        }),
        font:type({
            label:"Font",
            editorTemplate:"editor-font"
        }),
        fontFamily:type({
            label:"Font family",
            editorTemplate:"editor-font-family",
            defaultValue: null
        }),
        spinner: type({
            label: "Number spinner",
            editorTemplate: "editor-spinner"
        }),
        anchor: type({
            label: "Anchor",
            editorTemplate: "editor-anchor"
        }),
        choice: type({
            label: "Choice",
            editorTemplate: "editor-dropdown"
        }),
        choiceWithIcon: type({
            label: "Choice with icon",
            editorTemplate: "editor-switchgroup"
        }),
        quadAndLock: type({
            label: "4 values and lock",
            editorTemplate: "editor-roundedCorners"
        }),
        onOff: type({
            label: "On/off",
            editorTemplate: "editor-pushbuttons",
            defaultValue: false
        }),
        trueFalse: type({
            label: "True/False",
            editorTemplate: "editor-checkbox",
            defaultValue: false
        }),
        image: type({
            label: "Image",
            editorTemplate: "editor-imagepicker",
            argument: {image: true}
        }),
        icon: type({
            label: "Icon",
            editorTemplate: "editor-imagepicker",
            argument:{icon:true}
        }),
        box: type({
            label: "Left/Right/Top/Bottom",
            editorTemplate: "editor-box"
        }),
        pageLink: type({
            label: "Page link",
            editorTemplate: "editor-pagelink"
        }),

        iterate: function(callback){
            for (var i in fwk.PropertyTypes){
                var t = fwk.PropertyTypes[i];
                if (typeof t === "object"){
                    var result = callback(t,i);
                    if (result === false){
                        break;
                    }
                }
            }
        },
        findByEditorTemplate: function(template, defaultValue){
            var result;
            if (template[0] === "#"){
                template = template.substr(1);
            }

            var checkType = false;
            if (defaultValue && typeof defaultValue.__type__ !== undefined){
                checkType = true;
            }

            fwk.PropertyTypes.iterate(function(t){
                var sameTemplate = t.editorTemplate === template;
                var sameType = true;

                if (checkType && t.defaultValue){
                    sameType = defaultValue.__type__ === t.defaultValue.__type__;
                }

                if (sameTemplate && sameType){
                    result = t;
                    return false;
                }
            });

            return result;
        },

        findNameByTemplate: function(template){
            var result;
            if (template[0] === "#"){
                template = template.substr(1);
            }

            fwk.PropertyTypes.iterate(function(t,name){
                var sameTemplate = t.editorTemplate === template;

                if (sameTemplate){
                    result = name;
                    return false;
                }
            });

            return result;
        }
    };

    fwk.PropertyTypes.iterate(function(type, name){
        type.name = name;
    });

    return fwk.PropertyTypes;
});
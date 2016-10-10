Namespace("sketch.projects");

(function (fwk, ui) {

    klass2("sketch.projects.Nav2015Project", sketch.projects.Project, (function () {
        return {
            _constructor:function(){
                this.defaultScreenType = 'Browser';//'iPhone 6';
            },
            setupThemes:function () {
                var napkinTheme = {
                    styles:{
                        app:{
                            isCrazy:true
                        },
                        page:{
                            background:fwk.Brush.White
                        }
                    },
                    styleFor:{
                        'sketch.Application': 'app',
                        'sketch.ui.pages.PortableDevicePage':'page'
                    },
                    systemColors:{
                        '#fff': {
                            "button.fill": "Button fill",
                            "textBox.fill": "Text input fill",
                            "textArea.fill": "Text area fill",
                            "popup.fill": "Popup fill",
                            "form.fill": "Form fill",
                            "dialog.fill": "Dialog fill",
                            "listView.fill": "List view fill",
                            "tabContent.fill": "Tab content fill",
                            "tabHeader.selected.fill": "Slider fill",
                            "videoPlayer.fill": "Video player fill"
                        },
                        '#686868': {
                            "dynamics.label":"Label",
                            "button.stroke": "Button stroke",
                            "select.stroke": "Select stroke",
                            "form.stroke": "Form stroke",
                            "slider.stroke": "Slider stroke",
                            "textBox.stroke": "Text input stroke",
                            "textArea.stroke": "Text area stroke",
                            "textArea.disabled.stroke": "Disabled text area stroke",
                            "tab.stroke": "Tab stroke",
                            "radioButton.stroke": "Radio button stroke",
                            "radioButton.inner.fill": "Radio button inner fill",
                            "radioGroup.stroke": "Radio group stroke",
                            "checkbox.border": "Checkbox border",
                            "stackedTabs.stroke": "Stacked tabs stroke",
                            "separator.stroke": "Separator stroke",
                            "dialog.stroke": "Dialog stroke",
                            "dropdown.arrow.fill": "Drop down arrow fill",
                            "pager.stroke": "Pager stroke",
                            "popup.stroke": "Popup stroke",
                            "listView.stroke": "List view stroke",
                            "videoPlayer.stroke": "Video player stroke",
                            "icon.fill": "Icon fill"
                        },
                        "#515151": {
                            "default.text": "Default text",
                            "link.active.text": "Active link text",
                            "button.text": "Button text",
                            "textBox.text": "Text input text",
                            "textArea.text": "Text area text",
                            "dialog.header.text": "Dialog header text",
                            "radioButton.text": "Radio button text",
                            "checkbox.text": "Checkbox text color",
                            "checkbox.mark.fill": "Checkbox mark fill"
                        },
                        "#ccc": {
                            "navbarItem.selected.fill": "Navigation bar item selected fill",
                            "pill.selected.fill": "Pill selected fill",
                            "pager.selected.fill": "Pager selected fill",
                            "progress.fill": "Progress fill",
                            "alert.fill": "Alert fill",
                            "slider.fill": "Slider fill",
                            "tabHeader.fill": "Slider fill",

                            "button.disabled.stroke": "Button disabled border",
                            "textBox.disabled.stroke": "Text input disabled border",
                            "radioButton.disabled.stroke": "Radio button disabled border",
                            "checkbox.disabled.stroke": "Checkbox disabled border"
                        },
                        "#eee": {
                            "navbar.fill": "Navigation bar fill"
                        },
                        "#e5e5e5": {
                            "textBox.attach.fill": "Text input attachment fill",

                            "button.disabled.fill": "Button disabled fill",
                            "textBox.disabled.fill": "Text input disabled fill",
                            "textArea.disabled.fill": "Text area disabled fill",
                            "radioButton.disabled.fill": "Radio button disabled fill",
                            "checkbox.disabled.fill": "Checkbox disabled fill"
                        },
                        "#0088cc": {
                            "link.text": "Link text color"
                        },
                        "#aaa": {
                            "button.disabled.text": "Button disabled text",
                            "textBox.disabled.text": "Text input disabled text",
                            "textArea.disabled.text": "Text area disabled text",
                            "radioButton.disabled.text": "Radio button disabled text",
                            "checkbox.disabled.text": "Checkbox disabled text"
                        }
                    }
                };

                this._themes = {
                    "napkin":new sketch.projects.Theme(napkinTheme)
                };
            },
            loadInternal:function(app, deferred){
                fwk.Font.setDefaults({
                    family:"Open Sans",
                    size: 21,
                    weight: "300"
                });

                ui.IconsInfo.defaultFontFamily = 'NinjamockBasic2';

                if(!this._themesCreated){
                    this.setupThemes();
                    this._themesCreated = true;
                }

                this.loadStrings();
                deferred.resolve();
                // app.properties.theme.possibleValues({"napkin":"Napkin"});
                // this.changeTheme(app.theme(), deferred);
            },
            loadToolbox:function(toolbox){
                toolbox.clear();
                toolbox.setup({
                    categories:{
                        basic:{
                            label:"Basic",
                            expanded:true,
                            items: [
                                'ui.dynamics.templates.ImageTemplate',
                                'ui.dynamics.templates.IconTemplate',
                                "ui.dynamics.templates.Heading1Template",
                                "ui.dynamics.templates.Heading2Template",
                                "ui.dynamics.templates.Heading3Template",
                                "ui.dynamics.templates.LabelTemplate",
                                "ui.dynamics.templates.TextBlockTemplate",
                                "ui.dynamics.templates.TextBoxTemplate",
                                "ui.dynamics.templates.ComboBoxTemplate",
                                "ui.dynamics.templates.TextAreaTemplate",
                                "ui.dynamics.templates.ButtonTemplate",
                                "ui.common.composites.ClickSpot",
                                "ui.dynamics.templates.ButtonDropDownTemplate",
                                "ui.dynamics.templates.CheckBoxTemplate",
                                "ui.dynamics.templates.ProgressBarTemplate",
                                "ui.dynamics.templates.HScrollBarTemplate",
                                "ui.dynamics.templates.VScrollBarTemplate",
                                "ui.dynamics.templates.RadioGroupComposite"
                            ]
                        },
                        containers:{
                            label:"Containers",
                            expanded:true,
                            items: [
                                'ui.dynamics.templates.GroupTemplate',
                                'ui.dynamics.templates.RibbonTabsComposite',
                                'ui.dynamics.templates.RibbonComposite',
                                "ui.dynamics.templates.SmallRibbonComposite",
                                "ui.dynamics.templates.SmallRibbonButtonTemplate",
                                "ui.dynamics.templates.BigRibbonButtonTemplate"
                            ]
                        }
                    }
                });

                this.setupCommonToolboxCategories(toolbox);

                sketch.projects.Project.prototype.loadToolbox.apply(this, arguments);
            }

        }
    })());
})(sketch.framework, sketch.ui);
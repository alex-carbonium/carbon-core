define(["projects/Project"], function(Project){
    var fwk = sketch.framework;
    var ui = sketch.ui;
    return klass2("sketch.projects.WP8Project", Project, (function () {
        return {
            _constructor:function(){
                this.defaultScreenType = 'Lumia';
            },
            setupThemes:function () {
                var napkinTheme = {
                    styles:{
                        app:{
                            isCrazy:true
                        },
                        page:{
                            background:fwk.Brush.White
                        },
                        checkbox:{
                            "#Border":{
                                width:32,
                                height:32
                            },
                            "#Mark":{
                                width:24,
                                height:24,
                                left:4,
                                y:5
                            },
                            "#Label":{
                                x:31,
                                '&font':{size:29}
                            },
                            width:140,
                            height:32
                        },
                        radio:{
                            "#Outer":{
                                width:32,
                                height:32,
                                strokeWidth:2
                            },
                            "#Inner":{
                                width:16,
                                height:16,
                                x:8,
                                y:8
                            },
                            "#Label":{
                                x:31,
                                y:6,
                                '&font':{size:29}
                            },
                            width:170,
                            height:32
                        },
                        textbox:{
                            '#Label':{
                                '&font':{size:29}
                            }
                        },
                        button:{
                            '&font':{size:29}
                        },
                        icon:{
                            strokeWidth:3,
                            circleBrush:fwk.Brush.createFromColor("#686868")
                        }
                    },
                    styleFor:{
                        'sketch.Application': 'app',
                        'sketch.ui.pages.PortableDevicePage':'page',
                        'sketch.ui.win8.Checkbox':'checkbox',
                        'sketch.ui.win8.RadioButton':'radio',
                        'sketch.ui.win8.Textbox':'textbox',
                        'sketch.ui.win8.Button':'button',
                        'sketch.ui.wp8.WinPhone8':'phone',
                        'sketch.ui.win8.Win8Icon':'icon'
                    },
                    systemColors:{
                        '#fff':{
                            "wp8.def.button.push.rest.fill" :"Default push button fill",
                            "wp8.slider.rest.fill":"Slider rest fill",
                            "wp8.switch.stroke":"Toggle switch stroke",
                            "wp8.switch.handle.stroke":"Switch handle stroke",
                            "wp8.dialog.fill": "Dialog fill"
                        },
                        '#686868':{
                            "wp8.def.button.push.rest.stroke": "Default push button border",
                            "wp8.switch.outer.fill":"Toggle switch outer fill",
                            "wp8.switch.off.fill":"Toggle switch off fill",
                            "wp8.switch.on.fill": "Toggle switch on fill",
                            "wp8.slider.rest.stroke":"Slider rest stroke",
                            "wp8.radio.fill.mark":"Radio button center fill",
                            "wp8.slider.disabled.value.fill":"Slider disabled value fill",
                            "wp8.radio.border":"Radio button border",
                            "wp8.slider.rest.handle.fill":"Slider rest handle fill",
                            "wp8.label":"Label",
                            "wp8.dialog.stroke": "Dialog stroke"
                        },
                        "#515151":{
                            "default.text":"Default text",
                            "wp8.switch.text": "Toggle switch text",
                            "wp8.switch.handle.fill":"Toggle switch handle fill"
                        },
                        "#e5e5e5":{
                            "wp8.slider.disabled.fill":"Slider disabled fill",
                            "wp8.slider.disabled.stroke":"Slider disabled stroke",
                            "wp8.slider.rest.value.fill":"Slider rest value fill",
                            "wp8.radio.fill.mark.disabled":"Radio button center fill disabled",
                            "wp8.radio.border.disabled":"Radio button disabled border",
                            "wp8.switch.disabled.fill":"Toggle switch disabled fill",
                            "wp8.switch.dis.text":"Toggle switch disabled text"
                        },
                        "rgb(160,160,160)":{
                            "wp8.slider.disabled.handle.fill":"Slider disabled handle fill",
                            "wp8.switch.handle.dis.fill":"Toggle switch disabled handle fill"
                        },
                        "rgba(0,0,0,0)":{
                            "wp8.radio.fill":"Radio button fill" ,
                            "wp8.radio.fill.disabled":"Radio button disabled fill"
                        }
                    }
                };
            },
            loadInternal:function(app, deferred){
                fwk.Font.setDefaults({
                    family:fwk.FontInfo.defaultNapkinFont,
                    size: 21,
                    weight: "300"
                });

                ui.IconsInfo.defaultFontFamily = 'NinjamockWin8';

                if(!this._projectSetup){
                    this.setupThemes();
                    this._projectSetup = true;
                }

                this.loadStrings();
                deferred.resolve();
            },
            loadStrings: function(){
                Project.prototype.loadStrings.apply(this, arguments);
                sketch.Strings.add("sketch.ui.win8.Win8Icon", "Icon");
            },
            loadToolbox:function(toolbox){
                toolbox.clear();
                toolbox.setup({
                    categories:{
                        basic:{
                            label:"Basic",
                            expanded:true,
                            items: [
                                "ui.wp8.composites.Image",
                                "ui.wp8.composites.Icon",
                                "ui.wp8.composites.Label",
                                "ui.wp8.composites.Link",
                                "ui.wp8.composites.TextBlock",
                                "ui.wp8.composites.Header1",
                                "ui.wp8.composites.Header2",
                                "ui.wp8.composites.Pivot1Template",
                                "ui.win8.templates.ButtonTemplate",
                                "ui.common.composites.ClickSpot",
                                "ui.win8.templates.ToggleButtonTemplate",
                                "ui.win8.templates.CheckBoxTemplate",
                                "ui.wp8.templates.RadioButtonTemplate",
                                "ui.win8.templates.TextboxTemplate",
                                "ui.win8.composites.Password",
                                "ui.wp8.composites.Progress",
                                "ui.wp8.composites.Progress2",
                                "ui.wp8.composites.Slider",
                                "ui.wp8.templates.ToggleSwitch2",
                                "ui.wp8.composites.AppBarTemplate",
                                "ui.wp8.composites.ContextMenuTemplate"
                            ]
                        },
                        keyboards:{
                            label:"Keyboards",
                            expanded:true,
                            items: [
                                "ui.common.templates.TextKeyboardTemplate",
                                "ui.common.templates.NumericTemplate"
                            ]
                        },
                        pickers: {
                            label: "Pickers",
                            expanded:true,
                            items:[
                                "ui.wp8.composites.DatePicker",
                                "ui.wp8.composites.DatePicker2",
                                "ui.wp8.composites.TimePicker",
                                "ui.wp8.composites.ListPicker"
                            ]
                        },
                        list: {
                            label: "List project",
                            expanded:true,
                            items:[
                                "ui.wp8.composites.ListViewTemplate",
                                "ui.wp8.composites.ListViewItem1Template",
                                "ui.wp8.composites.ListViewItem2Template",
                                "ui.wp8.composites.ListViewItem3Template",
                                "ui.wp8.composites.ListViewItem6Template",
                                "ui.wp8.composites.ListViewItem4Template",
                                "ui.wp8.composites.ListViewItem5Template"
                          ]
                        },
                        dialogs: {
                            label: "Dialogs",
                            expanded:true,
                            items:[
                                "ui.wp8.composites.Dialog1Template",
                                "ui.wp8.composites.Dialog2Template"
                            ]
                        },
                        reminders:{
                            label:"Reminders",
                            expanded:true,
                            items:[
                                "ui.wp8.composites.Reminder1Template",
                                "ui.wp8.composites.Reminder2Template"
                            ]
                        },
                        toasts:{
                            label:"Toast notifications",
                            expanded:true,
                            items:[
                                "ui.wp8.composites.Toast1Template",
                                "ui.wp8.composites.Toast2Template"
                            ]
                        },
                        tiles:{
                            label:"Tiles",
                            expanded:true,
                            items:[
                                "ui.wp8.templates.TileTemplate"
                            ]
                        }
                    }
                });


                this.setupCommonToolboxCategories(toolbox);

                Project.prototype.loadToolbox.apply(this, arguments);
            }

        }
    })());
});
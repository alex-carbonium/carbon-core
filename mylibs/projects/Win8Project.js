define(["projects/Project"], function (Project) {
    var fwk = sketch.framework;
    var ui = sketch.ui;
    return klass2("sketch.projects.Win8Project", Project, (function () {
        return {
            _constructor: function() {
                this.defaultScreenType = 'Surface';
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
                        icon:{
                            borderWidth:3,
                            circleBrush:fwk.Brush.createFromColor("#686868")
                        }
                    },
                    styleFor:{
                        'sketch.Application': 'app',
                        'sketch.ui.pages.PortableDevicePage':'page',
                        'sketch.ui.win8.Win8Surface':'phone',
                        'sketch.ui.win8.Win8Icon':'icon'
                    },
                    systemColors:{
                        '#fff':{
                            "win8.def.button.push.rest.fill" :"Default push button fill",
                            "win8.linkbutton.fill.active":"Command button (link) active fill",
                            "win8.checkbox.mark.fill":"Checkbox mark fill",
                            "win8.radio.fill.mark":"Radio button center fill",
                            "win8.linkbutton.fill":"Command button (link) fill",
                            "win8.textbox.rest.fill":"Textbox rest fill",
                            "win8.tile.select.frame.mark":"Tile select frame mark",
                            "win8.tile.fill":"Tile fill",
                            "win8.contextmenu.fill":"Context menu fill",
                            "win8.contextmenu.item.active.text":"Context menu active item text",
                            "win8.combobox.fill":"Combobox fill",
                            "win8.flipper.fill":"Flipper fill",
                            "win8.togglebtn.on.glyph":"Toggle button on glyph",
                            "win8.togglebtn.off.fill":"Toggle button off fill",
                            "win8.slider.rest.fill":"Slider rest fill",
                            "win8.tooltip.fill": "Tooltip fill",
                            "win8.scrollbar.fill":"Scroll control fill",
                            "win8.appbar.fill":"App bar fill",
                            "win8.switch.stroke":"Toggle switch stroke",
                            "win8.switch.handle.stroke":"Switch handle stroke",
                            "win8.rating.inactive.fill": "Rating inactive fill",
                            "win8.dialog.fill": "Dialog fill",
                            "wp8.switch.stroke":"Toggle switch stroke",
                            "wp8.switch.handle.stroke":"Switch handle stroke"
                        },
                        '#686868':{
                            "wp8.switch.outer.fill":"Toggle switch outer fill",
                            "wp8.switch.off.fill":"Toggle switch off fill",
                            "wp8.switch.on.fill": "Toggle switch on fill",
                            "win8.switch.outer.fill":"Toggle switch outer fill",
                            "win8.appbar.stroke":"App bar stroke",
                            "win8.slider.rest.stroke":"Slider rest stroke",
                            "win8.radio.fill.mark.disabled":"Radio button center fill disabled",
                            "win8.def.button.font.default":"Default push button text",
                            "win8.checkbox.mark.fill.disabled":"Checkbox mark disabled fill",
                            "win8.togglebtn.on.fill.disable":"Toggle button disabled on fill",
                            "win8.togglebtn.off.stroke":"Toggle button off stroke",
                            "win8.togglebtn.on.fill":"Toggle button on fill",
                            "win8.togglebtn.on.stroke":"Toggle button on stroke",
                            "win8.togglebtn.off.glyph":"Toggle button off glyph",
                            "win8.scrollbar.handle.fill": "Scroll control handle fill",

                            "win8.switch.on.fill": "Toggle switch on fill",
                            "win8.appbaritem.stroke":"App bar item stroke",
                            "win8.checkbox.border":"Checkbox border",
                            "win8.textbox.rest.border":"Textbox rest border",
                            "win8.combobox.border":"Combobox border",
                            "win8.scrollbar.stroke":"Scroll control stroke",
                            "win8.slider.disabled.value.fill":"Slider disabled value fill",
                            "win8.textbox.disabled.border":"Textbox disabled border",
                            "win8.switch.outer.disabled.fill":"Toggle switch disabled outer fill",
                            "win8.radio.border":"Radio button border",
                            "win8.contextmenu.separator":"Context menu separator" ,
                            "win8.tile.select.frame.stroke":"Tile select frame stroke",
                            "win8.tile.select.frame.fill":"Tile select frame fill",
                            "win8.flipper.stroke":"Flipper stroke",
                            "win8.tooltip.stroke":"Tooltip stroke",
                            "win8.switch.off.fill":"Toggle switch off fill",
                            "win8.def.button.push.rest.stroke" :"Default push button border",
                            "win8.checkbox.fill":"Checkbox fill",
                            "win8.radio.fill":"Radio button fill",
                            "win8.linkbutton.stroke":"Command button (link) stroke",
                            "win8.linkbutton.text":"Command button (link) text",
                            "win8.contextmenu.item.text":"Context menu item text",
                            "win8.contextmenu.border":"Context menu border",
                            "win8.slider.rest.handle.fill":"Slider rest handle fill",

                            "win8.pageHeader":"Page header",
                            "win8.button.font.default": "Push button default text",
                            "win8.label":"Label",
                            "win8.rating.active.fill": "Rating active fill",
                            "win8.rating.inactive.stroke": "Rating inactive stroke",
                            "win8.rating.active.stroke": "Rating active stroke",
                            "win8.dialog.stroke": "Dialog stroke"
                        },
                        "#515151":{
                            "win8.checkbox.text":"Checkbox text color",
                            "win8.appbaritem.text":"App bar text",
                            "win8.linkbutton.fill.active.text":"Command button (link) active text",
                            "win8.switch.text":"Toggle switch text",
                            "default.text":"Default text",
                            "win8.radio.fill.disabled":"Radio button disabled fill",
                            "win8.radio.border.disabled":"Radio button disabled border",
                            "win8.combobox.mark":"Combobox mark",
                            "win8.togglebtn.off.glyph.disable":"Toggle button disabled off glyph",
                            "win8.switch.handle.fill":"Toggle switch handle fill",
                            "wp8.switch.text": "Toggle switch text",
                            "wp8.switch.handle.fill":"Toggle switch handle fill"
                        },
                        "#e5e5e5":{
                            "win8.checkbox.fill.disabled":"Checkbox disabled fill",
                            "win8.checkbox.border.disabled":"Checkbox disabled border",
                            "win8.textbox.disabled.fill":"Textbox disabled fill",
                            "win8.togglebtn.off.stroke.disabled":"Toggle button disabled off stroke",
                            "win8.togglebtn.on.stroke.disable":"Toggle button disabled on stroke",
                            "win8.togglebtn.off.fill.disable":"Toggle button disabled off fill",
                            "win8.togglebtn.on.glyph.disable":"Toggle button disabled on glyph",
                            "win8.slider.disabled.fill":"Slider disabled fill",
                            "win8.slider.rest.value.fill":"Slider rest value fill",
                            "win8.switch.disabled.fill":"Toggle switch disabled fill",
                            "win8.switch.dis.text":"Toggle switch disabled text",
                            "wp8.switch.disabled.fill":"Toggle switch disabled fill",
                            "wp8.switch.dis.text":"Toggle switch disabled text"
                        },
                        "rgb(217,90,0)": {
                            "win8.inlineError": "Inline error text"
                        },
                        "rgb(160,160,160)":{
                            "win8.slider.disabled.handle.fill":"Slider disabled handle fill",
                            "win8.switch.handle.dis.fill":"Toggle switch disabled handle fill",
                            "wp8.switch.handle.dis.fill":"Toggle switch disabled handle fill"
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


                if(!this._projectSetup){
                    this.setupThemes();
                    this._projectSetup = true;
                }

                ui.IconsInfo.defaultFontFamily = 'NinjamockWin8';
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
                                "ui.win8.composites.Image",
                                "ui.win8.composites.Icon",
                                "ui.win8.composites.Label",
                                "ui.win8.composites.InlineError",
                                "ui.win8.composites.PageHeader",
                                "ui.win8.composites.TextBlock",
                                "ui.win8.templates.TextboxTemplate",
                                "ui.win8.composites.Password",
                                "ui.win8.templates.ComboboxTemplate",
                                "ui.win8.templates.ButtonTemplate",
                                "ui.common.composites.ClickSpot",
                                "ui.win8.templates.ToggleButtonTemplate",
                                "ui.wp8.templates.ToggleSwitch2",
                                "ui.win8.templates.CheckBoxTemplate",
                                "ui.win8.templates.RadioButtonTemplate",
                                "ui.win8.templates.CommandButtonTemplate",
                                "ui.win8.composites.StarRating",
                                "ui.win8.templates.SelectableTileTemplate",
                                "ui.win8.composites.Flipper",
                                "ui.win8.composites.ContextMenuTemplate",
                                "ui.win8.templates.ContextMenuItemTemplate",
                                "ui.win8.templates.ContextMenuItemSeparator",
                                "ui.win8.composites.HorizontalScroll",
                                "ui.win8.composites.VerticalScroll",
                                "ui.win8.composites.Slider",
                                "ui.win8.templates.TooltipTemplate",
                                "ui.win8.composites.AppBarTemplate",
                                "ui.win8.templates.AppbarItemTemplate",
                                "ui.win8.templates.ClockTemplate"
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
                        flyouts: {
                            label: "Flyouts",
                            expanded:true,
                            items:[
                                "ui.win8.composites.Flyout1Template",
                                "ui.win8.composites.Flyout2Template",
                                "ui.win8.composites.Flyout3Template",
                                "ui.win8.composites.Flyout4Template"
                            ]
                        },
                        dialogs: {
                            label: "Dialogs",
                            expanded:true,
                            items:[
                                "ui.win8.composites.Dialog1Template"
                          ]
                        },
                        tiles: {
                            label: "Tiles",
                            expanded:true,
                            items:[
                                "ui.win8.composites.Tile1Template",
                                "ui.win8.composites.Tile2Template",
                                "ui.win8.composites.Tile3Template",
                                "ui.win8.composites.Tile4Template",
                                "ui.win8.composites.Tile5Template",
                                "ui.win8.composites.Tile6Template",
                                "ui.win8.composites.Tile7Template",
                                "ui.win8.composites.Tile8Template",
                                "ui.win8.composites.Tile9Template"
                            ]
                        },
                        toasts:{
                            label:"Toasts",
                            expanded:true,
                            items:[
                                "ui.win8.composites.Toast1Template",
                                "ui.win8.composites.Toast2Template",
                                "ui.win8.composites.Toast3Template"
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
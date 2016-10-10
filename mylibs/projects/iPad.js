(function (fwk, ui) {
    klass2("sketch.projects.iPad", sketch.projects.iOSProject, (function () {
        return {
            _constructor:function(){
                this.defaultScreenType = 'iPad(Retina)';
            },
            loadToolbox:function(toolbox){
                toolbox.clear();
                toolbox.setup({
                    categories:{
                        basic:{
                            label:"Basic",
                            expanded:true,
                            items: [
                                'ui.ios.templates.ImageTemplate',
                                'ui.ios.templates.IconTemplate2x',
                                "ui.ios.templates.HeaderTemplate",
                                "ui.ios.templates.LinkTemplate",
                                "ui.ios.templates.LabelTemplate",
                                "ui.ios.templates.TextBlockTemplate2x",
                                "ui.ios.templates.TextboxTemplate",
                                "ui.ios.composites.TextBox2",
                                "ui.ios.templates.ButtonTemplate",
                                "ui.common.composites.ClickSpot",
                                "ui.ios.composites.ButtonPlus",
                                "ui.ios.composites.ButtonMinus",
                                "ui.ios.composites.ButtonCheck",
                                "ui.ios.composites.ButtonI",
                                "ui.ios.composites.ArchiveButtonTemplate",
                                "ui.ios.composites.FlagButtonTemplate",
                                "ui.ios.composites.DeleteButtonTemplate",
                                "ui.ios.composites.SwitchTemplate",
                                "ui.ios.composites.Switch2Template",
                                "ui.ios.templates.TagTemplate",
                                "ui.ios.templates.StepperTemplate",
                                "ui.ios.templates.CheckboxTemplate",
                                "ui.ios.templates.ProgressTemplate",
                                "ui.ios.templates.SliderTemplate",
                                "ui.ios.templates.StatusBarTemplate",
                                "ui.ios.composites.TabBarTemplate",
                                "ui.ios.composites.SegmentedTemplate",
                                "ui.ios.composites.PageIndicator",
                                "ui.ios.composites.MediaButtons"

                            ]
                        },
                        keyboards:{
                            label:"Keyboards",
                            expanded:DEBUG,
                            items: [
                                "ui.common.templates.TextKeyboardTemplate",
                                "ui.common.templates.NumericTemplate"
                            ]
                        },
                        bars:{
                            label:"Bars",
                            expanded:DEBUG,
                            items: [
                                "ui.ios.composites.ChoiceBar",
                                "ui.ios.composites.SplitBar",
                                "ui.ios.templates.SearchBoxTemplate",
                                "ui.ios.composites.SearchBox2Template",
                                "ui.ios.composites.Navbar1Template",
                                "ui.ios.composites.Navbar2Template",
                                "ui.ios.composites.Navbar3Template",
                                "ui.ios.composites.ProgressViewTemplate"
                            ]
                        },
                        pickers:{
                            label:"Pickers",
                            expanded:DEBUG,
                            items: [
                                "ui.ios.composites.PickerTemplate",
                                "ui.ios.composites.DatePickerTemplate",
                                "ui.ios.composites.Calendar"
                            ]
                        },
                        lists:{
                            label:"Lists",
                            expanded:DEBUG,
                            items: [
                                "ui.ios.composites.ListView1Template",
                                "ui.ios.composites.ListViewItem1Template",
                                "ui.ios.composites.ListViewItem2Template",
                                "ui.ios.composites.ListViewItem3Template",
                                "ui.ios.composites.ListViewItem4Template",
                                "ui.ios.composites.ListViewItem5Template",
                                "ui.ios.composites.ListViewItem6Template" ,
                                "ui.ios.composites.ListViewHeaderTemplate",
                                "ui.ios.composites.RoundCornerList"
                            ]
                        },
                        dialogs:{
                            label:"Dialogs",
                            expanded:DEBUG,
                            items: [
                                "ui.ios.composites.Dialog1",
                                "ui.ios.composites.Dialog2"
                            ]
                        },
                        popups:{
                            label:"Popups",
                            expanded:DEBUG,
                            items: [
                                "ui.ios.composites.Popup",
                                "ui.ios.composites.PopupWithList"
                            ]
                        },
                        actionsheets:{
                            label:"Action Sheets",
                            expanded:DEBUG,
                            items: [
                                "ui.ios.composites.ActionSheet",
                                "ui.ios.composites.ActionSheet2"
                            ]
                        }
                    }
                });

                this.setupCommonToolboxCategories(toolbox);

                sketch.projects.iOSProject.prototype.loadToolbox.apply(this, arguments);
            }

        }
    })());
})(sketch.framework, sketch.ui);
define(["projects/Theme"], function (Theme) {
    var fwk = sketch.framework;

    //toolbox is lazy loaded in parallel, but all resources must be in place for app to render
    var combinedTheme = {
        systemColors: {
            '#fff': {
                "web.button.fill": "Button fill",
                "web.textBox.fill": "Text input fill",
                "web.textArea.fill": "Text area fill",
                "web.popup.fill": "Popup fill",
                "web.form.fill": "Form fill",
                "web.dialog.fill": "Dialog fill",
                "web.listView.fill": "List view fill",
                "web.tabContent.fill": "Tab content fill",
                "web.tabHeader.selected.fill": "Slider fill",
                "web.videoPlayer.fill": "Video player fill",

                "android.button.fill": "Button fill",
                "android.onOff.on.fontBrush": "On/Off on font brush",
                "android.onOff.off.fontBrush": "On/Off off font brush",
                "android.onOff.disabled.on.fontBrush": "On/Off disabled on font brush",
                "android.onOff.disabled.off.fontBrush": "On/Off disabled off font brush",
                "android.actionBar.fill": "Action bar fill",
                "android.tabBar.fill": "Tab bar fill",
                "android.list.fill": "List fill",
                "android.list.header.fill": "List header fill",
                "android.menu.fill": "Menu fill",
                "android.picker.fill": "Time picker fill",
                "android.googleNow.fill": "Google now fill",
                "android.dialog.fill": "Dialog fill"
            },
            '#686868': {
                "web.button.stroke": "Button stroke",
                "web.select.stroke": "Select stroke",
                "web.form.stroke": "Form stroke",
                "web.slider.stroke": "Slider stroke",
                "web.textBox.stroke": "Text input stroke",
                "web.textArea.stroke": "Text area stroke",
                "web.textArea.disabled.stroke": "Disabled text area stroke",
                "web.tab.stroke": "Tab stroke",
                "web.radioButton.stroke": "Radio button stroke",
                "web.radioButton.inner.fill": "Radio button inner fill",
                "web.radioGroup.stroke": "Radio group stroke",
                "web.checkbox.border": "Checkbox border",
                "web.stackedTabs.stroke": "Stacked tabs stroke",
                "web.separator.stroke": "Separator stroke",
                "web.dialog.stroke": "Dialog stroke",
                "web.dropdown.arrow.fill": "Drop down arrow fill",
                "web.pager.stroke": "Pager stroke",
                "web.popup.stroke": "Popup stroke",
                "web.listView.stroke": "List view stroke",
                "web.videoPlayer.stroke": "Video player stroke",
                "icon.fill": "Icon fill",

                "android.button.stroke": "Button stroke",
                "android.button.text": "Button text",
                "android.textField.text": "Text field text",
                "android.textField.stroke": "Text field stroke",
                "android.radioButton.stroke": "Radio button stroke",
                "android.radioButton.inner.fill": "Radio button inner fill",
                "android.radioGroup.stroke": "Radio group stroke",
                "android.checkbox.mark.fill.disabled": "Checkbox mark disabled fill",
                "android.checkbox.border": "Checkbox border",
                "android.actionBar.stroke": "Action bar stroke",
                "android.separator.stroke": "Separator stroke",
                "android.tabBar.stroke": "Tab bar stroke",
                "android.tabBar.selected.stroke": "Tab bar selected stroke",
                "android.spinner.line.stroke": "Spinner line stroke",
                "android.list.stroke": "List stroke",
                "android.list.header.stroke": "List header separator stroke",
                "android.menu.stroke": "Menu stroke",
                "android.dialog.stroke": "Dialog stroke",
                "android.dialog.header.stroke": "Dialog header stroke",
                "android.toast.stroke": "Toast stroke",
                "android.picker.stroke": "Time picker stroke",
                "android.picker.text": "Time picker text",
                "android.googleNow.stroke": "Google now stroke"
            },
            "#515151": {
                "default.text": "Default text",
                "web.link.active.text": "Active link text",
                "web.button.text": "Button text",
                "web.textBox.text": "Text input text",
                "web.textArea.text": "Text area text",
                "web.dialog.header.text": "Dialog header text",
                "web.radioButton.text": "Radio button text",
                "web.checkbox.text": "Checkbox text color",
                "web.checkbox.mark.fill": "Checkbox mark fill",

                "android.dialog.header.text": "Dialog header text",
                "android.onOff.on.fill": "On/Off on fill",
                "android.onOff.off.fill": "On/Off off fill",
                "android.radioButton.text": "Radio button text",
                "android.checkbox.text": "Checkbox text color",
                "android.checkbox.mark.fill": "Checkbox mark fill",
                "android.toast.text": "Toast text",
                "android.notification.text": "Notification text",
                "android.picker.selected.text": "Time picker selected text"
            },
            "#ccc": {
                "web.navbarItem.selected.fill": "Navigation bar item selected fill",
                "web.pill.selected.fill": "Pill selected fill",
                "web.pager.selected.fill": "Pager selected fill",
                "web.progress.fill": "Progress fill",
                "web.alert.fill": "Alert fill",
                "web.slider.fill": "Slider fill",
                "web.tabHeader.fill": "Slider fill",

                "web.button.disabled.stroke": "Button disabled border",
                "web.textBox.disabled.stroke": "Text input disabled border",
                "web.radioButton.disabled.stroke": "Radio button disabled border",
                "web.checkbox.disabled.stroke": "Checkbox disabled border"
            },
            "#eee": {
                "web.navbar.fill": "Navigation bar fill"
            },
            "#e5e5e5": {
                "web.textBox.attach.fill": "Text input attachment fill",

                "web.button.disabled.fill": "Button disabled fill",
                "web.textBox.disabled.fill": "Text input disabled fill",
                "web.textArea.disabled.fill": "Text area disabled fill",
                "web.radioButton.disabled.fill": "Radio button disabled fill",
                "web.checkbox.disabled.fill": "Checkbox disabled fill",

                "android.onOff.fill": "On/Off fill",
                "android.checkbox.text.disabled": "Checkbox disabled text color",
                "android.textField.disabled.fontBrush": "Text field disabled font brush",
                "android.checkbox.border.disabled": "Checkbox disabled border",
                "android.button.disabled.border": "Button disabled border",
                "android.button.disabled.text": "Button disabled text",
                "android.toast.fill": "Toast fill",
                "android.notification.fill": "Notification fill"
            },
            "#0088cc": {
                "web.link.text": "Link text color"
            },
            "#aaa": {
                "web.button.disabled.text": "Button disabled text",
                "web.textBox.disabled.text": "Text input disabled text",
                "web.textArea.disabled.text": "Text area disabled text",
                "web.radioButton.disabled.text": "Radio button disabled text",
                "web.checkbox.disabled.text": "Checkbox disabled text"
            },

            "#ababab": {
                "android.onOff.disabled.on.fill": "On/Off disabled on fill",
                "android.onOff.disabled.off.fill": "On/Off disabled off fill"
            }
        }
    };

    var loadCompleted = function () {
        fwk.Resources.completed.unbind(this, loadCompleted);

        this._app.releaseLoadRef();
        if (this._callback) {
            this._callback();
        }
    };

    var loadResources = function (callback) {
        this._app.addLoadRef();
        this._callback = callback;

        var theme = combinedTheme;
        fwk.Resources.startLoading();
        if (theme.resources) {
            if (theme.resources.loadImage) {
                for (var j = 0, k = theme.resources.loadImage.length; j < k; ++j) {
                    var params = theme.resources.loadImage[j];
                    if (!fwk.Resources[params[0]]) {
                        fwk.Resources.loadImage.apply(fwk.Resources, params);
                    }
                }
            }
            if (theme.resources.loadGradientFromPoints) {
                for (var j = 0, k = theme.resources.loadGradientFromPoints.length; j < k; ++j) {
                    var params = theme.resources.loadGradientFromPoints[j];
                    if (!fwk.Resources[params[1]]) {
                        fwk.Resources.loadGradientFromPoints.apply(fwk.Resources, params);
                    }
                }
            }
            if (theme.resources.addSystemResource) {
                for (var j = 0, k = theme.resources.addSystemResource.length; j < k; ++j) {
                    var params = theme.resources.addSystemResource[j];
                    if (!fwk.Resources[params[0]]) {
                        fwk.Resources.addSystemResource.apply(fwk.Resources, params);
                    }
                }
            }
        }

        var i = 0;
        for (var color in theme.systemColors) {
            if (this._setSystemColors) {
                fwk.Resources.setSystemColor(color, i++);
            }
            var colorAppliesTo = theme.systemColors[color];
            for (var id in colorAppliesTo) {
                if (!fwk.Resources[id]) {
                    fwk.Resources.addSystemResource(id, colorAppliesTo[id], fwk.Brush.createFromColor(color));
                }
            }
        }

        fwk.Resources.completed.bind(this, loadCompleted);
        fwk.Resources.completeLoading();
    };

    return klass2("sketch.projects.Project", null, (function () {
        return {
            _constructor: function () {
                // this._themes=[];
                this.landscapeSupported = true;
                this.portraitSupported = true;
                this.templateSupported = true;
            },
            load: function (app, deferred) {
                this._app = app;
                this.loadStrings();
                var that = this;
                this.loadSprites().then(function () {
                    loadResources.call(that, function(){
                        that.loadInternal(app, deferred);
                    })
                }).fail(deferred.reject);
                return deferred;
            },
            loadSprites: function () {
                var promises = [];
                for (var i in sketch.ui.IconsInfo.sprites) {
                    var sprite = sketch.ui.IconsInfo.sprites[i];
                    promises.push(fwk.Resources.loadImage(sprite.name, sprite.url));
                }
                return fwk.Deferred.when(promises);
            },
            loadSatellite: function (app, deferred) {
                this._app = app;

                this.loadStrings();

                var spritesLoaded = this.loadSprites();
                fwk.Deferred.when(spritesLoaded).then(function () {
                    deferred.resolve();
                });
                return deferred.promise();
            },
            loadStrings: function () {
                sketch.Strings.add("sketch.ui.common.ClickSpot", "Click spot");
            },

            createNewPage: function (type) {
                var page = new sketch.ui.pages.PortableDevicePage();
                page.setProps({
                    screenType: this.defaultScreenType,
                    orientation: (type || "portrait")
                });

                return page;
            },
            addNewPage: function (type) {
                var newPage = this.createNewPage(type);
                this._app.addPage(newPage);
                this._app.setActivePage(newPage);
            }
        }
    })());
});
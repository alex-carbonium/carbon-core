define(function () {
    return klass((function () {
        var showMessage = function () {
            var that = this;
            var args = arguments;
            setTimeout(function () {
                notify.apply(this, args);
            }, 1000);
        };

        var showStartupMessage = function () {
            if (sketch.params.isCopyOfDemo) {
                showMessage.call(this, "info", {
                    title: "This is your own project now",
                    text: "We have created your own copy of the demo project. Enjoy!"
                });
            }
            if (sketch.params.isOwnNewProjectSaved) {
                showMessage.call(this, "info", {
                    title: "This is your own project now",
                    text: "We have saved your recent work and created your own project. Enjoy!"
                });
            }
        };

        return {
            _constructor: function (app) {
                this._app = app;

                app.loaded.then(showStartupMessage.bind(this));
            },
            detach: function () {

            }
        };
    })());
});
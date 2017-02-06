define(["framework/sync/Primitive"], function (Primitive) {
    var fwk = sketch.framework;

    return klass((function () {
        function subscribe() {
            var that = this;


            fwk.pubSub.subscribe("pageStatus.changed", EventHandler(this, pageStatusChangedExternally).closure());


            this._app.releaseLoadRef();
        }

        function pageStatusChangedExternally(message, data) {
            var page = DataNode.getImmediateChildById(this._app, data.pageId, true);
            if (page && page.status() !== data.statusId) {
                this._changingStatus = true;
                page.status(data.statusId);
                this._changingStatus = false;
            }
        }

        return {
            _constructor: function (app) {
                this._app = app;
                this._subscriptions = {};

                app.loadedLevel1.then(subscribe.bind(this));
                app.addLoadRef();
            }
        }
    })());
});
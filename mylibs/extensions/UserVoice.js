define(function () {
    return klass((function () {
        var run = function () {
            $(".uv-tab").show();

            var uvOptions = {};
            (function () {
                var uv = document.createElement('script');
                uv.type = 'text/javascript';
                uv.async = true;
                uv.src = ('https:' == document.location.protocol ? 'https://' : 'http://') + 'widget.uservoice.com/52HOXpqqJ8pBvzbkN82qFQ.js';
                var s = document.getElementsByTagName('script')[0];
                s.parentNode.insertBefore(uv, s);
            })();

            this._app.releaseLoadRef();
        };

        return {
            _constructor: function (app) {
                this._app = app;
                //app.loaded.bind(this, run);
                app.addLoadRef();
            },
            detach: function () {

            }
        };
    })());
});
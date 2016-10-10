define(function () {
    var fwk = sketch.framework;

    klass2("sketch.framework.notifier", null, (function () {
        var offset;

        var defaultOptions = {
            title: 'Title',
            text: 'Notice',
            shadow: false,
            opacity: 1,
            delay: 8000,
            cornerclass: 'ui-pnotify-sharp',
            before_open: function(pnotify) {
                pnotify.css({
                    top: offset.top + 5,
                    left: offset.left - pnotify.width() - 20,
                    "z-index": 16000
                });
            }
        };

        var Notice = function(element, options){
            var self = this;
            self.options = options;
            self.update = function(){
                var options = extend(true, {}, defaultOptions);
                options = extend(true, options, self.options);
                element.pnotify(options);
            };
        };

        return {
            _constructor:function () {
                //extending stack defaults for some reason does not have any action
                $.pnotify.defaults.stack.spacing1 = 5;
                $.pnotify.defaults.stack.spacing2 = 5;
            },
            show: function(type, options){
                if(!offset) {
                    offset = $("#right_sidebar_content").offset();
                }
                var opt = extend(true, {}, defaultOptions);

                opt.type = type;
                //if before_open was provided, it should be executed and then notifier centered
                if(options && options["before_open"]){
                    var original = options["before_open"];
                    opt["before_open"] = function(pnotify){
                        original(pnotify);
                        defaultOptions["before_open"](pnotify);
                    };
                    delete options["before_open"];
                }

                extend(true, opt, options);
                var element = $.pnotify(opt);
                return new Notice(element, opt);
            }

        };

    })());

    notify = function notify(){
        if (!sketch.framework.notifier.current){
            sketch.framework.notifier.current = new sketch.framework.notifier();
        }
        return sketch.framework.notifier.current.show.apply(sketch.framework.notifier.current, arguments);
    }
});
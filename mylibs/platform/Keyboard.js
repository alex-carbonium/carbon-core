define(["platform/Platform"], function(platform) {
    var fwk = sketch.framework;
    var Keyboard = klass2("sketch.platform.Keyboard", null, {
        _constructor: function() {
            var that = this;
            this._commandKeys = {};
        },

        _attachGlobalHandler: function(event, callback) {
            var element = document;

            if (element.addEventListener) {
                element.addEventListener(event, callback, false);
            }
            else if (element.attachEvent) {
                element.attachEvent('on' + event, callback);
            }
            else {
                element['on' + event] = callback;
            }
        },

        addShortcut: function(target, shortcutString, callback, options) {

            var disableInInput = (options && options.disableInInput !== undefined) ?  options.disableInInput : true;
            var keyType = (options && options.keyType !== undefined) ?  options.keyType : "keydown";

            if (disableInInput === undefined){
                disableInInput = true;
            }
            shortcut.add(shortcutString, callback, {
                type: keyType,
                propagate: false,
                disable_in_input: disableInInput
            });
        },
        disableShortcut: function(shortcutString){
            shortcut.disable(shortcutString);
        },
        enableShortcut: function(shortcutString){
            shortcut.enable(shortcutString);
        },
        addCommandShortcut: function(target, shortcutString, commandConstructor) {
            var template = commandConstructor();

            this._commandKeys[template.name()] = shortcutString;

            this.addShortcut(target, shortcutString, function() {
                var command = commandConstructor();
                fwk.commandManager.execute(command);
            });
        },

        getShortcutKey: function(command) {
            var key = this._commandKeys[command.name()];
            if (key === undefined) {
                return null;
            }
            return key;
        }
    });

    platform.keyboard = new Keyboard();

    return platform.keyboard;
});

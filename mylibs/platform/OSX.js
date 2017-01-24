define(["platform/Desktop"], function(Desktop) {
    return klass(Desktop, {
        _constructor: function() {
            this.mapShortcut("1", "library1");
            this.mapShortcut("2", "library2");
            this.mapShortcut("3", "library3");
            this.mapShortcut("4", "library4");

            this.mapShortcut("meta+shift+>", "fontIncreaseSize");
            this.mapShortcut("meta+shift+<", "fontDecreaseSize");            

            this.mapShortcut("meta+d", "duplicate");
            this.mapShortcut("meta+g", "groupElements");
            this.mapShortcut("meta+shift+g", "ungroupElements");
            this.mapShortcut("meta+alt+r", "groupInRepeater");
            this.mapShortcut("meta+alt+p", "convertToPath");
            this.mapShortcut("meta+alt+m", "groupWithMask");
            this.mapShortcut("del", "delete");
            this.mapShortcut("backspace", "delete");

            this.mapShortcut("meta+b", "fontBold");
            this.mapShortcut("meta+i", "fontItalic");
            this.mapShortcut("meta+u", "fontUnderline");

            this.mapShortcut("meta+a", "selectAll");

            this.mapShortcut("meta+shift+]", "bringToFront");
            this.mapShortcut("meta+shift+[", "sendToBack");
            this.mapShortcut("meta+up", "bringForward");
            this.mapShortcut("meta+down", "sendBackward");

            this.mapShortcut("meta+n", "newPagePortrait");
            this.mapShortcut("meta+shift+n", "newPageLandscape");

            this.mapShortcut("meta+f", "showNavigationPane");

            this.mapShortcut("left", "moveLeft");
            this.mapShortcut("right", "moveRight");
            this.mapShortcut("up", "moveUp");
            this.mapShortcut("down", "moveDown");

            this.mapShortcut("alt+meta+u", "pathUnion");
            this.mapShortcut("alt+meta+s", "pathSubtract");
            this.mapShortcut("alt+meta+i", "pathIntersect");
            this.mapShortcut("alt+meta+x", "pathDifference");

            this.mapShortcut("shift+left", "moveLeft10");
            this.mapShortcut("shift+right", "moveRight10");
            this.mapShortcut("shift+up", "moveUp10");
            this.mapShortcut("shift+down", "moveDown10");

            this.mapShortcut("alt+left", "moveLeft.1");
            this.mapShortcut("alt+right", "moveRight.1");
            this.mapShortcut("alt+up", "moveUp.1");
            this.mapShortcut("alt+down", "moveDown.1");

            this.mapShortcut("left", "moveFinished", {type: "keyup"});
            this.mapShortcut("right", "moveFinished", {type: "keyup"});
            this.mapShortcut("up", "moveFinished", {type: "keyup"});
            this.mapShortcut("down", "moveFinished", {type: "keyup"});
            this.mapShortcut("shift+left", "moveFinished", {type: "keyup"});
            this.mapShortcut("shift+right", "moveFinished", {type: "keyup"});
            this.mapShortcut("shift+up", "moveFinished", {type: "keyup"});
            this.mapShortcut("shift+down", "moveFinished", {type: "keyup"});
            this.mapShortcut("alt+left", "moveFinished", {type: "keyup"});
            this.mapShortcut("alt+right", "moveFinished", {type: "keyup"});
            this.mapShortcut("alt+up", "moveFinished", {type: "keyup"});
            this.mapShortcut("alt+down", "moveFinished", {type: "keyup"});

            this.mapShortcut("meta+z", "undo");
            this.mapShortcut("meta+shift+z", "redo");

            this.mapShortcut("shift+x", "swapColors");

            this.mapShortcut("f2", "editText");

            this.mapShortcut("meta+shift+d", "debugMode");
            this.mapShortcut("p", "addPath");
            this.mapShortcut("r", "addRectangle");
            this.mapShortcut("o", "addCircle");
            this.mapShortcut("v", "movePointer");
            this.mapShortcut("d", "movePointerDirect");
            this.mapShortcut("l", "addLine");
            this.mapShortcut("y", "addPencil");
            this.mapShortcut("a", "artboardTool");
            this.mapShortcut("shift+a", "artboardViewerTool");
            this.mapShortcut("t", "textTool");
            this.mapShortcut("i", "imageTool");

            this.mapShortcut("space", "handTool", {repeatable: false});
            this.mapShortcut("space", "handToolRelease", {type: "keyup"});
            this.mapShortcut("h", "handToolH");

            this.mapShortcut("meta+s", "save");
            this.mapShortcut("meta+alt+s", "forceSave");

            this.mapShortcut("meta+alt+shift+9", "sacred");

            this.mapShortcut("esc", "cancel");
            this.mapShortcut("enter", "enter");

            this.mapShortcut("z", "zoomIn");
            this.mapShortcut("alt+z", "zoomOut");
            this.mapShortcut("meta+1", "zoom100");
            this.mapShortcut("meta+2", "zoom2:1");
            this.mapShortcut("meta+3", "zoom4:1");
            this.mapShortcut("meta+4", "zoom8:1");
            this.mapShortcut("meta+.", "zoomFit");
            this.mapShortcut("meta+alt+s", "zoomSelection");

            this.mapShortcut("f", "toggleFrame");

            this.mapShortcut("meta+shift+e", "editTemplate");
        },

        registerClipboardShortcuts: function(){
            this.mapShortcut("meta+c", "copy");
            this.mapShortcut("meta+v", "paste");
            this.mapShortcut("meta+x", "cut");
        },

        getActionShortcut: function(actionName){
            if(actionName === 'copy') {
              return "meta+c";
            } else if(actionName === 'paste') {
              return "meta+p";
            } else if(actionName === 'cut') {
              return "meta+x";
            }
            return Desktop.prototype.getActionShortcut.apply(this, arguments);
        },

        getActionShortcutDisplayLabel:function(actionName) {
            var shortcut = Desktop.prototype.getActionShortcutDisplayLabel.apply(this, arguments);
          if(shortcut){
            shortcut = shortcut
              .replace(/cmd/i, "⌘")
              .replace(/shift/i, "⇧")
              .replace(/Alt/i, "⌥")
              .replace(/Ctrl/i, "⌃")
              .replace(/\+/ig, "")
          }
          return shortcut;
        }
    });
});

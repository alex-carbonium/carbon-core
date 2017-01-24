define(["platform/Desktop"], function(Desktop) {
    return klass(Desktop, {
        _constructor: function() {
            this.mapShortcut("1", "library1");
            this.mapShortcut("2", "library2");
            this.mapShortcut("3", "library3");
            this.mapShortcut("4", "library4");

          this.mapShortcut("ctrl+shift+>", "fontIncreaseSize");
          this.mapShortcut("ctrl+shift+<", "fontDecreaseSize");

          this.mapShortcut("ctrl+d", "duplicate");
          this.mapShortcut("ctrl+g", "groupElements");
          this.mapShortcut("ctrl+shift+g", "ungroupElements");
          this.mapShortcut("ctrl+alt+r", "groupInRepeater");
          this.mapShortcut("ctrl+alt+p", "convertToPath");
          this.mapShortcut("ctrl+alt+m", "groupWithMask");
          this.mapShortcut("del", "delete");
          this.mapShortcut("backspace", "delete");

          this.mapShortcut("ctrl+b", "fontBold");
          this.mapShortcut("ctrl+i", "fontItalic");
          this.mapShortcut("ctrl+u", "fontUnderline");

          this.mapShortcut("ctrl+a", "selectAll");

          this.mapShortcut("ctrl+shift+]", "bringToFront");
          this.mapShortcut("ctrl+shift+[", "sendToBack");
          this.mapShortcut("ctrl+up", "bringForward");
          this.mapShortcut("ctrl+down", "sendBackward");

          this.mapShortcut("ctrl+n", "newPagePortrait");
          this.mapShortcut("ctrl+shift+n", "newPageLandscape");

          this.mapShortcut("ctrl+f", "showNavigationPane");

          this.mapShortcut("left", "moveLeft");
          this.mapShortcut("right", "moveRight");
          this.mapShortcut("up", "moveUp");
          this.mapShortcut("down", "moveDown");

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

          this.mapShortcut("ctrl+z", "undo");
          this.mapShortcut("ctrl+y", "redo");

          this.mapShortcut("shift+x", "swapColors");

          this.mapShortcut("f2", "editText");

          this.mapShortcut("alt+ctrl+u", "pathUnion");
          this.mapShortcut("alt+ctrl+s", "pathSubtract");
          this.mapShortcut("alt+ctrl+i", "pathIntersect");
          this.mapShortcut("alt+ctrl+x", "pathDifference");

          this.mapShortcut("ctrl+shift+d", "debugMode");
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

          this.mapShortcut("ctrl+s", "save");

          this.mapShortcut("ctrl+alt+S", "forceSave");

          this.mapShortcut("ctrl+alt+shift+9", "sacred");

          this.mapShortcut("esc", "cancel");
          this.mapShortcut("enter", "enter");

          this.mapShortcut("z", "zoomIn");
          this.mapShortcut("alt+z", "zoomOut");
          this.mapShortcut("ctrl+0", "zoom100");
          this.mapShortcut("ctrl+.", "zoomFit");

          this.mapShortcut("f", "toggleFrame");

          this.mapShortcut("ctrl+shift+e", "editTemplate");
        },

        registerClipboardShortcuts: function(){
            this.mapShortcut("ctrl+c", "copy");
            this.mapShortcut("ctrl+v", "paste");
            this.mapShortcut("ctrl+x", "cut");
        },

        getActionShortcut: function(actionName){
            if(actionName === 'copy') {
              return "ctrl+c";
            } else if(actionName === 'paste') {
              return "ctrl+p";
            } else if(actionName === 'cut') {
              return "ctrl+x";
            }
            return Desktop.prototype.getActionShortcut.apply(this, arguments);
        }
    });
});

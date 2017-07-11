import { ViewTool } from "../framework/Defs";
import { IShortcut, IApp, IShortcutScheme, IShortcutManager } from "carbon-core";
import params from "../params";

export default class ShortcutManager implements IShortcutManager {
    actionShortcuts: {[action: string]: IShortcut[]};

    constructor() {
        this.actionShortcuts = {};
    }

    mapScheme(scheme: IShortcutScheme) {
        var shortcuts;
        if (params.deviceOS === "Mac OS"){
            shortcuts = scheme.mac;
        }
        else{
            shortcuts = scheme.windows;
        }

        for (let i = 0; i < shortcuts.length; ++i) {
            let shortcut = shortcuts[i];

            var actionShortctus = this.actionShortcuts[shortcut.action];
            if (!actionShortctus) {
                actionShortctus = [];
                this.actionShortcuts[shortcut.action] = actionShortctus;
            }
            actionShortctus.push(shortcut);
        }
    }

    mapDefaultScheme(){
        this.mapScheme({
            mac: ShortcutManager.MacShortcuts,
            windows: ShortcutManager.WindowsShortcuts
        })
    }

    getActionHotkey(actionName) {
        var shortcuts = this.actionShortcuts[actionName];
        if (shortcuts) {
            return shortcuts[0].key;
        }
        return "";
    }

    getActionHotkeyDisplayLabel(actionName) {
        var shortcut = this.getActionHotkey(actionName);
        if (shortcut) {
            shortcut = shortcut
                .replace(/Down/i, "↓")
                .replace(/Up/i, "↑")
                .replace(/Left/i, "←")
                .replace(/Right/i, "→")
                .replace(/Delete/i, "Del")
                .replace(/Insert/i, "Ins");
        }
        return shortcut;
    }

    private static WindowsShortcuts: IShortcut[] = [
        { key: "1", action: "library1" },
        { key: "2", action: "library2" },
        { key: "3", action: "library3" },
        { key: "4", action: "library4" },

        { key: "ctrl+shift+.", action: "fontIncreaseSize" },
        { key: "ctrl+shift+,", action: "fontDecreaseSize" },
        { key: "alt+shift+.", action: "fontIncreaseSize1" },
        { key: "alt+shift+,", action: "fontDecreaseSize1" },

        { key: "ctrl+d", action: "duplicate" },
        { key: "ctrl+g", action: "groupElements" },
        { key: "ctrl+shift+g", action: "ungroupElements" },
        { key: "ctrl+alt+r", action: "groupInRepeater" },
        { key: "ctrl+alt+p", action: "convertToPath" },
        { key: "ctrl+alt+m", action: "groupWithMask" },
        { key: "del", action: "delete" },
        { key: "backspace", action: "delete" },

        { key: "ctrl+b", action: "fontBold" },
        { key: "ctrl+i", action: "fontItalic" },
        { key: "ctrl+u", action: "fontUnderline" },

        { key: "alt+i", action: "isolateSelection" },

        { key: "ctrl+a", action: "selectAll" },

        { key: "ctrl+shift+]", action: "bringToFront" },
        { key: "ctrl+shift+[", action: "sendToBack" },
        { key: "ctrl+]", action: "bringForward" },
        { key: "ctrl+[", action: "sendBackward" },

        { key: "ctrl+n", action: "newPagePortrait" },
        { key: "ctrl+shift+n", action: "newPageLandscape" },

        { key: "left", action: "moveLeft" },
        { key: "right", action: "moveRight" },
        { key: "up", action: "moveUp" },
        { key: "down", action: "moveDown" },

        { key: "shift+left", action: "moveLeft10" },
        { key: "shift+right", action: "moveRight10" },
        { key: "shift+up", action: "moveUp10" },
        { key: "shift+down", action: "moveDown10" },

        { key: "alt+left", action: "moveLeft.1" },
        { key: "alt+right", action: "moveRight.1" },
        { key: "alt+up", action: "moveUp.1" },
        { key: "alt+down", action: "moveDown.1" },

        { key: "left", action: "moveFinished", options: { type: "keyup" } },
        { key: "right", action: "moveFinished", options: { type: "keyup" } },
        { key: "up", action: "moveFinished", options: { type: "keyup" } },
        { key: "down", action: "moveFinished", options: { type: "keyup" } },
        { key: "shift+left", action: "moveFinished", options: { type: "keyup" } },
        { key: "shift+right", action: "moveFinished", options: { type: "keyup" } },
        { key: "shift+up", action: "moveFinished", options: { type: "keyup" } },
        { key: "shift+down", action: "moveFinished", options: { type: "keyup" } },
        { key: "alt+left", action: "moveFinished", options: { type: "keyup" } },
        { key: "alt+right", action: "moveFinished", options: { type: "keyup" } },
        { key: "alt+up", action: "moveFinished", options: { type: "keyup" } },
        { key: "alt+down", action: "moveFinished", options: { type: "keyup" } },

        { key: "ctrl+z", action: "undo" },
        { key: "ctrl+y", action: "redo" },

        { key: "shift+x", action: "swapColors" },

        { key: "f2", action: "enter" },

        { key: "alt+ctrl+u", action: "pathUnion" },
        { key: "alt+ctrl+s", action: "pathSubtract" },
        { key: "alt+ctrl+i", action: "pathIntersect" },
        { key: "alt+ctrl+x", action: "pathDifference" },

        { key: "/", action: "transparentColor" },

        { key: "ctrl+shift+d", action: "debugMode" },
        { key: "p", action: "pathTool" },
        { key: "r", action: "rectangleTool" },
        { key: "o", action: "circleTool" },
        { key: "v", action: "pointerTool" },
        { key: "d", action: "pointerDirectTool" },
        { key: "l", action: "lineTool" },
        { key: "y", action: "pencilTool" },
        { key: "a", action: "artboardTool" },
        { key: "shift+a", action: "artboardViewerTool" },
        { key: "t", action: "textTool" },
        { key: "i", action: "imageTool" },

        { key: "h", action: "handTool" },
        { key: "space", action: "handTool", options: { repeatable: false } },
        { key: "space", action: "handToolRelease", options: { type: "keyup" } },

        { key: "ctrl+s", action: "save" },

        { key: "ctrl+alt+S", action: "forceSave" },

        { key: "ctrl+alt+shift+9", action: "sacred" },

        { key: "esc", action: "cancel" },
        { key: "enter", action: "enter" },

        { key: "z", action: "zoomIn" },
        { key: "alt+z", action: "zoomOut" },
        { key: "ctrl+0", action: "zoom100" },
        { key: "ctrl+.", action: "zoomFit" },

        { key: "f", action: "toggleFrame" }
    ];


    private static MacShortcuts: IShortcut[] = [
        { key: "1", action: "library1" },
        { key: "2", action: "library2" },
        { key: "3", action: "library3" },
        { key: "4", action: "library4" },

        { key: "meta+shift+.", action: "fontIncreaseSize" },
        { key: "meta+shift+,", action: "fontDecreaseSize" },
        { key: "alt+shift+.", action: "fontIncreaseSize1" },
        { key: "alt+shift+,", action: "fontDecreaseSize1" },

        { key: "meta+d", action: "duplicate" },
        { key: "meta+g", action: "groupElements" },
        { key: "meta+shift+g", action: "ungroupElements" },
        { key: "meta+alt+r", action: "groupInRepeater" },
        { key: "meta+alt+p", action: "convertToPath" },
        { key: "meta+alt+m", action: "groupWithMask" },
        { key: "del", action: "delete" },
        { key: "backspace", action: "delete" },

        { key: "meta+b", action: "fontBold" },
        { key: "meta+i", action: "fontItalic" },
        { key: "meta+u", action: "fontUnderline" },

        { key: "alt+i", action: "isolateSelection" },

        { key: "meta+a", action: "selectAll" },

        { key: "meta+shift+]", action: "bringToFront" },
        { key: "meta+shift+[", action: "sendToBack" },
        { key: "meta+]", action: "bringForward" },
        { key: "meta+[", action: "sendBackward" },

        { key: "meta+n", action: "newPagePortrait" },
        { key: "meta+shift+n", action: "newPageLandscape" },

        { key: "left", action: "moveLeft" },
        { key: "right", action: "moveRight" },
        { key: "up", action: "moveUp" },
        { key: "down", action: "moveDown" },

        { key: "alt+ctrl+u", action: "pathUnion" },
        { key: "alt+ctrl+s", action: "pathSubtract" },
        { key: "alt+ctrl+i", action: "pathIntersect" },
        { key: "alt+ctrl+x", action: "pathDifference" },

        { key: "/", action: "transparentColor" },

        { key: "shift+left", action: "moveLeft10" },
        { key: "shift+right", action: "moveRight10" },
        { key: "shift+up", action: "moveUp10" },
        { key: "shift+down", action: "moveDown10" },

        { key: "alt+left", action: "moveLeft.1" },
        { key: "alt+right", action: "moveRight.1" },
        { key: "alt+up", action: "moveUp.1" },
        { key: "alt+down", action: "moveDown.1" },

        { key: "left", action: "moveFinished", options: { type: "keyup" } },
        { key: "right", action: "moveFinished", options: { type: "keyup" } },
        { key: "up", action: "moveFinished", options: { type: "keyup" } },
        { key: "down", action: "moveFinished", options: { type: "keyup" } },
        { key: "shift+left", action: "moveFinished", options: { type: "keyup" } },
        { key: "shift+right", action: "moveFinished", options: { type: "keyup" } },
        { key: "shift+up", action: "moveFinished", options: { type: "keyup" } },
        { key: "shift+down", action: "moveFinished", options: { type: "keyup" } },
        { key: "alt+left", action: "moveFinished", options: { type: "keyup" } },
        { key: "alt+right", action: "moveFinished", options: { type: "keyup" } },
        { key: "alt+up", action: "moveFinished", options: { type: "keyup" } },
        { key: "alt+down", action: "moveFinished", options: { type: "keyup" } },

        { key: "meta+z", action: "undo" },
        { key: "meta+shift+z", action: "redo" },

        { key: "shift+x", action: "swapColors" },

        { key: "f2", action: "enter" },

        { key: "meta+shift+d", action: "debugMode" },
        { key: "p", action: "pathTool" },
        { key: "r", action: "rectangleTool" },
        { key: "o", action: "circleTool" },
        { key: "v", action: "pointerTool" },
        { key: "d", action: "pointerDirectTool" },
        { key: "l", action: "lineTool" },
        { key: "y", action: "pencilTool" },
        { key: "a", action: "artboardTool" },
        { key: "shift+a", action: "artboardViewerTool" },
        { key: "t", action: "textTool" },
        { key: "i", action: "imageTool" },

        { key: "h", action: "handTool" },
        { key: "space", action: "handTool", options: { repeatable: false } },
        { key: "space", action: "handToolRelease", options: { type: "keyup" } },

        { key: "meta+s", action: "save" },
        { key: "meta+alt+s", action: "forceSave" },

        { key: "meta+alt+shift+9", action: "sacred" },

        { key: "esc", action: "cancel" },
        { key: "enter", action: "enter" },

        { key: "z", action: "zoomIn" },
        { key: "alt+z", action: "zoomOut" },
        { key: "meta+1", action: "zoom100" },
        { key: "meta+2", action: "zoom2:1" },
        { key: "meta+3", action: "zoom4:1" },
        { key: "meta+4", action: "zoom8:1" },
        { key: "meta+.", action: "zoomFit" },
        { key: "meta+alt+s", action: "zoomSelection" },

        { key: "f", action: "toggleFrame" }
    ];
}
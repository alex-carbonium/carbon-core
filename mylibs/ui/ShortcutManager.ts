import { IShortcut, IApp, IShortcutScheme, IShortcutManager } from "carbon-core";
import params from "../params";

export default class ShortcutManager implements IShortcutManager {
    actionShortcuts: {[action: string]: IShortcut[]};

    constructor() {
        this.actionShortcuts = {};
    }

    mapScheme(scheme: IShortcutScheme) {
        let shortcuts;
        let isMac = params.deviceOS === "Mac OS";
        if (isMac){
            shortcuts = scheme.mac;
        }
        else{
            shortcuts = scheme.windows;
        }

        for (let i = 0; i < shortcuts.length; ++i) {
            let shortcut = shortcuts[i];
            this.formatShortcut(shortcut, isMac);

            var actionShortctus = this.actionShortcuts[shortcut.action];
            if (!actionShortctus) {
                actionShortctus = [];
                this.actionShortcuts[shortcut.action] = actionShortctus;
            }
            actionShortctus.push(shortcut);
        }
    }

    clear() {
        this.actionShortcuts = {};
    }

    getActionHotkey(actionName) {
        var shortcuts = this.actionShortcuts[actionName];
        if (shortcuts) {
            return shortcuts[0].display;
        }
        return "";
    }

    private formatShortcut(shortcut: IShortcut, mac: boolean) {
        shortcut.display = shortcut.key;

        if (mac) {
            shortcut.display = shortcut.display
                .replace(/meta/, "⌘")
                .replace(/shift/, "⇧")
                .replace(/ctrl/, "⌃")
                .replace(/alt/, "⌥")
                .replace(/option/, "⌥")
                .replace(/backspace/, "⌫")
                .replace(/del/, "⌦")
                .replace(/esc/, "⎋")
                .replace(/\+/g, "")
                .toUpperCase();
        }
        else {
            shortcut.display = shortcut.display
                .replace(/backspace/, "bkspc")
                .replace(/\+/g, " ");
        }

        shortcut.display = shortcut.display
            .replace(/down/, "↓")
            .replace(/up/, "↑")
            .replace(/left/, "←")
            .replace(/right/, "→")
            .replace(/tab/, "⇥")
            .replace(/space/, "␣")
            .replace(/enter/, "⏎");
    }
}
import Workspace from "./Workspace";
import { Contributions } from "./extensions/Contributions";
import { getBuiltInExtensions } from "./extensions/BuiltInExtensions";

var extensions = require("extensions/All");

export default class SystemExtensions {
    private _extensions:any[];
    private _contributions;

    detachExtensions() {
        this._contributions.dispose();
        if (this._extensions && this._extensions.length) {
            for (var i = 0; i < this._extensions.length; ++i) {
                this._extensions[i].detach();
            }
        }
        this._extensions = null;
    }

    initExtensions(app, view, controller) {
        this._extensions = [];
        for (var i = 0, l = extensions.length; i < l; ++i) {
            var Extension = extensions[i];
            var extension = new Extension(app);

            if (extension.attach) {
                extension.attach(app, view, controller);
            }

            this._extensions.push(extension);
        }

        this._contributions = new Contributions(app, app.actionManager, Workspace.shortcutManager);
        var builtinExtensions = getBuiltInExtensions(app, view, controller);
        builtinExtensions.forEach(x => x.initialize(this._contributions));
    }
}
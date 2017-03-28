import ExtensionBase from "./ExtensionBase";

export default class RuntimeExtension extends ExtensionBase{
    constructor(app, view, controller) {
        super(app, view, controller);
    }

    attach(app, view, controller){
        super.attach.apply(this, arguments);
        this.app.loaded.then(() => {this.onLoaded()});
    }

    onLoaded(){
    }
}

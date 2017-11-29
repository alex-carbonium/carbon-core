import { IDisposable } from "carbon-basics";
import { AutoDisposable } from "../../AutoDisposable";
import { NavigationController } from "./NavigationController";

export class RuntimeContext implements IDisposable {
    private disposables = new AutoDisposable();
    public readonly navigationController;

    constructor() {
        this.disposables.add(this.navigationController = new NavigationController());
    }


    dispose() {
        this.disposables.dispose();
    }

}
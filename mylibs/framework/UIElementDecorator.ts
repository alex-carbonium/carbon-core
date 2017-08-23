import { IUIElement } from "carbon-core";

export default class UIElementDecorator {
	[x: string]: any;

	private _visible: boolean;

	constructor() {
		this.element = null;
		this._visible = true;
	}

	attach(element) {
		this.element = element;
	}

	detach() {
		this.element = null;
	}

	beforeInvoke(method:string, args:any[]):boolean|void {
	}

	afterInvoke(method:string, args:any[]):boolean|void {
	}

	parent(value) {
	}

	visible(value?: boolean) {
		if (arguments.length === 1) {
			this._visible = value;
		}
		return this._visible;
	}
}
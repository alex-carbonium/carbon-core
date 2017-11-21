import { IUIElement } from "carbon-core";

export default class UIElementDecorator {
	[x: string]: any;

	public visible: boolean;

	constructor() {
		this.element = null;
		this.visible = true;
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
}
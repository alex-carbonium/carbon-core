export default class UIElementDecorator {
	[x: string]: any;

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

	visible(value) {
		if (arguments.length === 1) {
			this._visible = value;
		}
		return this._visible;
	}
}
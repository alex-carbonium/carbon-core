export default class UIElementDecorator {
	[x: string]: any;

	constructor() {
		this.element = null;
		this._visible = true;
	}
	attach(element) {
		this.element = element;
	}
	addDecorator() {
	}
	detach() {
		this.element = null;
	}
	draw(context) {
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
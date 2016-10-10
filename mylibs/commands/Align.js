import Composite from "./../framework/commands/CompositeCommand";
import aligner from "framework/Aligner";

export default class Align extends Composite {
    constructor(name, elements) {
        var commands = aligner.align(name, elements);
        super(commands);
    }
}

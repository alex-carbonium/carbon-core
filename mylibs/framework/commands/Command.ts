export default class Command {
    [x: string]: any;

    constructor(primitives?) {
        this._transparent = false;
        this._primitives = primitives;
    }

    canExecute(){
        return true;
    }

    flushRedoStack() {
        return true;
    }

    execute(isRedo){
    }

    rollback(){
    }

    transparent(value){
        if (arguments.length === 1 && value !== undefined){
            this._transparent = value;
        }
        return this._transparent;
    }

    toPrimitiveList(): any{
        return this._primitives;
    }
}

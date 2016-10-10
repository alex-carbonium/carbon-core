export default class Command {
    constructor(primitives){
        this._transparent = false;
        this._primitives = primitives;
    }

    canExecute(){
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

    toPrimitiveList(){
        return this._primitives;
    }   
}

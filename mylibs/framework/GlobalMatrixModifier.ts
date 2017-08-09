import Matrix from "../math/matrix";
import Environment from "../environment";
import { IMatrix } from "carbon-core";

type Modifier = (m: Matrix) => Matrix;

export class GlobalMatrixModifier {
    modifiers: { (m: IMatrix): IMatrix }[] = [];
    private oldModifiers: { (m: IMatrix): IMatrix }[] = [];

    push(modifier: Modifier){
        this.modifiers.push(modifier);
    }
    pushPrependScale(){
        this.push(m => m.prepended(Environment.view.scaleMatrix));
    }
    pushPrependTranslation(tx: number, ty: number){
        let tm = Matrix.createTranslationMatrix(tx, ty);
        this.push(m => m.prepended(tm));
    }
    pop(){
        this.modifiers.pop();
    }

    replace(newModifier: Modifier) {
        this.oldModifiers.length = 0;
        for (var i = 0; i < this.modifiers.length; i++) {
            this.oldModifiers.push(this.modifiers[i]);
        }
        this.modifiers.length = 0;
        this.push(newModifier)
    }
    restore() {
        this.modifiers.length = 0;
        for (var i = 0; i < this.oldModifiers.length; i++) {
            this.modifiers.push(this.oldModifiers[i]);
        }
        this.oldModifiers.length = 0;
    }

    applyToMatrix(matrix: IMatrix): IMatrix{
        var m = matrix;
        for (let i = 0; i < this.modifiers.length; ++i) {
            let modifier = this.modifiers[i];
            m = modifier(m);
        }
        return m;
    }
}

export default new GlobalMatrixModifier();
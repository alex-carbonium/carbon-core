import Matrix from "../math/matrix";
import Environment from "../environment";
import { IMatrix } from "carbon-core";

type Modifier = (m: Matrix) => Matrix;

export class GlobalMatrixModifier {
    modifiers: { (m: IMatrix): IMatrix }[] = [];

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
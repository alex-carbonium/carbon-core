import Matrix from "../math/matrix";
import Environment from "../environment";
import { IMatrix } from "carbon-core";

export default class GlobalMatrixModifier {
    static modifiers: { (m: IMatrix): IMatrix }[] = [];

    static push(modifier: (m: Matrix) => Matrix){
        GlobalMatrixModifier.modifiers.push(modifier);
    }
    static pushPrependScale(){
        GlobalMatrixModifier.push(m => m.prepended(Environment.view.scaleMatrix));
    }
    static pop(){
        GlobalMatrixModifier.modifiers.pop();
    }

    static applyToMatrix(matrix: IMatrix): IMatrix{
        var m = matrix;
        for (let i = 0; i < GlobalMatrixModifier.modifiers.length; ++i) {
            let modifier = GlobalMatrixModifier.modifiers[i];
            m = modifier(m);
        }
        return m;
    }
}
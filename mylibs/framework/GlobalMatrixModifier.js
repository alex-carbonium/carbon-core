import Matrix from "../math/matrix";
import Environment from "../environment";

export default class GlobalMatrixModifier {
    static modifiers: { (m: Matrix): Matrix }[] = [];

    static push(modifier: (m: Matrix) => Matrix){
        GlobalMatrixModifier.modifiers.push(modifier);
    }
    static pushPrependScale(){
        GlobalMatrixModifier.push(m => m.prepended(Environment.view.scaleMatrix));
    }
    static pop(){        
        GlobalMatrixModifier.modifiers.pop();
    }

    static applyToMatrix(matrix: Matrix): Matrix{
        var m = matrix;
        for (let i = 0; i < GlobalMatrixModifier.modifiers.length; ++i) {
            let modifier = GlobalMatrixModifier.modifiers[i];
            m = modifier(m);
        }
        return m;
    }
}
import Selection from "framework/SelectionModel";
import Path from "framework/Path";
import Environment from "environment";
import { ILayer, IUIElement, IContainer, IIsolationLayer, IIsolatable } from "carbon-core";
import { LayerTypes } from "carbon-app";


const EditPath = {
    run: function(path:Path){
        // if(!(path instanceof Path)) {
        //     return;
        // }

        // var isolationObject = new PathManipulationObject(path, mode);

        // var layer = Environment.view.getLayer(LayerTypes.Isolation) as IIsolationLayer;

        // layer.isolateObject(isolationObject);
        // layer.invalidate();
    }
}

export default EditPath;
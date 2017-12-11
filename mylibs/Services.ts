import { ICompilerService } from "carbon-app";
import CompilerService from "./code/compiler/CompilerService";

class Services {
    compiler:ICompilerService = CompilerService;
}

export default new Services();
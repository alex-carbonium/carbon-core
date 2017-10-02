import TestFontInfo from "./TestFontInfo";
import { OpenTypeFontManager } from "carbon-core";

export default class TestFontManager extends OpenTypeFontManager {
    constructor(app){
        super(app);

        this.add(new TestFontInfo());
    }
}
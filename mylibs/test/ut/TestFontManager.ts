import FontManager from "../../framework/text/font/fontmanager";
import TestFontInfo from "./TestFontInfo";
import OpenTypeFontManager from "../../OpenTypeFontManager";

export default class TestFontManager extends OpenTypeFontManager {
    constructor(app){
        super(app);

        this.add(new TestFontInfo());
    }
}
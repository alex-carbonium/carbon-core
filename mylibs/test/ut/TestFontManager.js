import FontManager from "../../framework/text/font/fontmanager";
import TestFontInfo from "./TestFontInfo";

export default class TestFontManager extends FontManager{
    constructor(){
        super();

        this.add(new TestFontInfo());
    }
}
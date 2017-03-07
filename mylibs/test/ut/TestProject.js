import Project from "projects/Project";
import Page from "framework/Page";

export default class TestProject extends Project{
    createNewPage(){
        return new Page();
    }
}

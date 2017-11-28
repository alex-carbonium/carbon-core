export default class Link
{
    constructor(element, artboard,connection) {
        this.element = element;
        this.artboard = artboard;
        this.artboardId = artboard.id;
        this.connection = connection;
    }
}
define(function(){
    sketch.Strings = {};
    sketch.Strings.data = {};

    sketch.Strings.get = function(key){
        return sketch.Strings.data[key];
    };

    var add = sketch.Strings.add = function(key, value){
        sketch.Strings.data[key] = value;
    };

    add("project_name:", "Project name:");
    add("Add a new comment", "Add a new comment");
    add("Reply to this comment...", "Reply to this comment...");
    add("leaving?", "Unsaved changes exist.");

    sketch.Strings.add = add;

    add("sketch.Application", "Application");
    add("sketch.framework.Page", "Page");
    // add("sketch.ui.pages.PortableDevicePage", "Page");
    add("sketch.ui.common.TextArea", "Text area");
    add("sketch.ui.common.Label", "Label");
    add("sketch.ui.common.TextBlock", "Text block");
    add("sketch.ui.common.Image", "Image");
    add("sketch.ui.common.Icon", "Icon");
    add("sketch.ui.common.StackPanel", "Stack panel");
    add("sketch.ui.common.AlignPanel", "Align panel");
    add("sketch.ui.common.DockPanel", "Dock panel");
    add("sketch.ui.common.Canvas", "Canvas");
    add("sketch.ui.common.CellGroup", "Table");
    add("sketch.ui.common.Table", "Table");
    add("sketch.ui.common.TableCell", "Cell");
    add("sketch.ui.common.TextTableCell", "Text cell");
    add("Rectangle", "Rectangle");
    add("Star", "Star");
    add("Circle", "Circle");
    add("Polygon", "Polygon");
    add("Line", "Line");
    add("sketch.framework.GroupContainer", "Group");
    // add("sketch.ui.common.PortableDevicePanel", "Phone");
    // add("sketch.ui.common.PortableDeviceResizePanel", "Device page resize panel");
    // add("sketch.ui.common.PortableDevice", "Device");

    add("Path", "Path");

    add("sketch.framework.NullPage", "No page");
    add("sketch.framework.NoSelectionElement", "Empty selection");
    add("sketch.framework.ScrollContainer", "Scroll container");
    add("sketch.ui.common.CommentNote", "Note");
    add("sketch.framework.CorruptedElement", "Corrupted element");
    add("CompoundPath", "Compound path");

    // TODO: move foundation labels from here
    //if (sketch.framework.SelectFrame)
    {
        // add("sketch.ui.pages.PreviewPage", "Page");
//            add("sketch.ui.common.ElementDragCreator", "Drag creator");
//            add("sketch.ui.common.ElementPointCreator", "Point creator");
//            add("sketch.ui.common.LineCreator", "Line creator");
//            add("sketch.ui.common.PencilCreator", "Pencil creator");
//            add("sketch.ui.common.EditModeAction", "Edit mode action");
//            add("ketch.ui.common.HandTool", "Hand tool");
        add("sketch.ui.pages.TemplateEditorPage", "Template editor page");
        add("SelectComposite", "Multiple elements");  // foundation
        add("sketch.svg.Path", "Svg path");  // foundation
        add("Section", "Section");  // foundation
    }
});
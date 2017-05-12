//TODO: change all enum to const enum when all files are migrated

export enum TileSize {
    Auto,
    Small,
    Large,
    XLarge
}

export enum DockStyle {
    Left,
    Top,
    Right,
    Bottom,
    Fill,
    None
};

export enum HorizontalAlignment {
    None,
    Left,
    Right,
    Stretch,
    Center
};

export enum VerticalAlignment {
    None,
    Top,
    Bottom,
    Stretch,
    Middle
};

export enum StackAlign {
    Default,
    Center
};
export enum StackOrientation {
    Vertical,
    Horizontal
};

export enum ArrangeStrategies {
    Canvas,
    Stack,
    Dock,
    Align,
    Repeat,
    Group
};

export enum Overflow {
    Clip,
    Visible,
    //Adjust - grow and shrink with content
    AdjustVertical,
    AdjustHorizontal,
    AdjustBoth,
    //Expand - only grow, don't shrink
    ExpandVertical,
    ExpandHorizontal,
    ExpandBoth
};

export var ViewTool = {
    Pointer: "pointerTool",
    Section: "sectionTool",
    Text: "textTool",
    Path: "pathTool",
    Rectangle: "rectangleTool",
    Star: "starTool",
    Triangle: "triangleTool",
    Polygon: "polygonTool",
    Artboard: "artboardTool",
    Circle: "circleTool",
    Line: "lineTool",
    Proto: "protoTool",
    Pencil: "pencilTool",
    Hand: "handTool",
    PointerDirect: "pointerDirectTool",
    Image: "imageTool",
    ArtboardViewer: "artboardViewerTool"
};

export enum PointDirection {
    Vertical = 1,
    Horizontal = 2,
    Any = 3
};

export var FrameCursors = [
    'n-resize',
    'ne-resize',
    'e-resize',
    'se-resize',
    's-resize',
    'sw-resize',
    'w-resize',
    'nw-resize',
    '', //removed
    'move',
    'pen_move_point'
];

export var RotationCursors = [];
for (let i = 1; i <= 8; ++i) {
    RotationCursors.push("rotate-" + i);
}

export enum ContentBehavior {
    Original,
    Stretch,
    Scale
}

export enum StyleType {
    Visual = 1,
    Text = 2
}

export enum ActionType {
    GoToPage = 0,
    GoBack = 1
}

export enum AnimationType {
    SlideLeft = 0,
    SlideRight = 1,
    SlideUp = 2,
    SlideDown = 3,
    Dissolve = 4
}

export enum EasingType {
    None = 0,
    EaseOut = 2,
    EaseIn = 3,
    EaseInOut = 4
}

export enum ActionEvents {
    click = 0,
    mousemove = 1,
    mousedown = 2,
    mouseup = 3,
    mouseenter = 4,
    mouseleave = 5,
    dblclick = 6
}

export var Devices = [
    { name: "Responsive" },
    { name: "iPhone 6 (375 x 667)", w: 375, h: 667 },
    { name: "iPhone 6 Plus (414 x 736)", w: 414, h: 736 },
    { name: "iPhone 5 (320 x 568)", w: 320, h: 568 },
    { name: "iPad (768 x 1024)", w: 768, h: 1024 },
    { name: "Galaxy S5 (360 x 640)", w: 360, h: 640 },
    { name: "Nexus 5X (411 x 731)", w: 411, h: 731 },
    { name: "Nexus 6P (435 x 773)", w: 435, h: 773 }
];

export enum StoryType {
    Flow = 0,
    Prototype = 1
};

export enum MirrorViewMode {
    OriginalSize = 0,
    Fit = 1
}

export enum ElementState {
    Resize = 0,
    Edit = 1
};

export enum ArtboardResource {
    Stencil = 1,
    Template = 2,
    Frame = 3,
    Palette = 4
}

export var Types = {
    'Path': 'p',
    'Text': 't',
    'Element': 'e',
    'Container': 'w',
    'Brush': 'b',
    'Font': 'f',
    'Artboard': 'a',
    'ArtboardFrame': 'af',
    'CorruptedElement': 'x',
    'DraggingElement': 'd',
    'Image': 'F',
    'ImageContent': 'FC',
    'GroupContainer': 'g',
    'App': 'A',
    'Guide': 'H',
    'CustomGuide': 'C',
    'LayoutGridColumns': 'L',
    'LayoutGridLines': 'O',
    'ArtboardTemplateControl': 'T',
    'Circle': 'o',
    'CompositeElement': 'm',
    'Page': 'G',
    'Line': 'l',
    'Polygon': 'y',
    'Rectangle': 'r',
    'Section': 'S',
    'SelectComposite': 'M',
    'SelectFrame': 'E',
    'Shape': 's',
    'Star': 'W',
    'StateBoard': 'Q',
    'RepeatCell': 'c',
    'RepeatContainer': 'R',
    'Story': 'k',
    'StoryAction': 'K',
    'ArtboardToolSettings': 'u',
    'DefaultShapeSettings': 'U',
    'DefaultLineSettings': 'UL',
    'CompoundPath': 'D',
    'AlignPanel': 'Z',
    'Canvas': 'h',
    'DockPanel': 'V',
    'StackPanel': 'v',
    'DefaultFormatter': 'j',
    'RangeFormatter': 'J',
    'ArtboardPage': 'P',
    'ArtboardProxyPage': 'z',
    'NullPage': 'X',
    'ClickSpot': 'Y',
    'QuadAndLock': 'q',
    'Box': 'B',
    'Shadow': 'i',
    'TransformationElement': 'te',
    'ResizeRotateElement': 'rr'
};

if (DEBUG) {
    var map = {};
    for (var t in Types) {
        var c = Types[t];
        if (map.hasOwnProperty(c)) {
            throw new Error("Duplicate type code " + c);
        }
        map[c] = true;
    }
}

export enum StrokePosition {
    Center = 0,
    Inside = 1,
    Outside = 2
};

export enum ContextBarPosition {
    None = 0,
    Left = 1,
    Right = 2,
    Only = 4
}

export enum LineCap {
    Butt,
    Round,
    Square
};

export enum LineJoin {
    Miter,
    Bevel,
    Round
};

export var FloatingPointPrecision = 10;
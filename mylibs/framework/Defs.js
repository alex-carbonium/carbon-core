export var PrimitiveType = {
    None: 0,
    DataNodeAdd: 1,
    DataNodeRemove: 2,
    DataNodeChange: 3,
    DataNodeSetProps: 4,
    DataNodeChangePosition: 5,
    DataNodePatchProps: 6
};

export var PatchType = {
    Insert: 1,
    Remove: 2,
    Change: 3
};

export var ChangeMode = {
    Model: 0, //update model
    Root: 1, //update node and its root, skip model update
    Self: 2 //update node only
};

export var TileSize = {
    Auto:0,
    Small:1,
    Large:2,
    XLarge:3
}

export var DockStyle = {
    Left: 0,
    Top: 1,
    Right: 2,
    Bottom: 3,
    Fill: 4,
    None: 5
};

export var HorizontalAlignment = {
    None: 0,
    Left: 1,
    Right: 2,
    Stretch: 3,
    Center: 4
};

export var VerticalAlignment = {
    None: 0,
    Top: 1,
    Bottom: 2,
    Stretch: 3,
    Middle: 4
};

export var StackAlign = {
    Default: 0,
    Center: 1
};
export var StackOrientation = {
    Vertical: 0,
    Horizontal: 1
};

export var ArrangeStrategies = {
    Canvas: 0,
    Stack: 1,
    Dock: 3,
    Align: 4,
    Repeat: 5
};

export var Overflow = {
    Clip: 0,
    Visible: 1,
    //Adjust - grow and shrink with content
    AdjustVertical: 2,
    AdjustHorizontal: 3,
    AdjustBoth: 4,
    //Expand - only grow, don't shrink
    ExpandVertical: 5,
    ExpandHorizontal: 6,
    ExpandBoth: 7
};

export var ViewTool = {
    Pointer: 1,
    Section: 2,
    Text: 3,
    Path: 4,
    Rectangle: 5,
    Star: 6,
    Triangle: 7,
    Polygon: 8,
    Artboard: 9,
    Circle: 10,
    Line: 11,
    Proto: 12,
    Pencil: 13,
    Hand: 14,
    PointerDirect: 15,
    ArtboardViewer: 16
};

export var PointDirection = {
    Vertical: 1,
    Horizontal: 2,
    Any: 3
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
    'rotate_cursor',
    'move',
    'move_point'
];

export var TextAlign = {
    left: 1,
    center: 2,
    right: 3,
    justify: 4,
    top: 5,
    middle: 6,
    bottom: 7
};

export var FontWeight = {
    Thin: 100,
    ExtraLight: 200,
    Light: 300,
    Regular: 400,
    Medium: 500,
    SemiBold: 600,
    Bold: 700,
    ExtraBold: 800,
    Heavy: 900
};

export var FontStyle = {
    Normal: 1,
    Italic: 2
};

export var FontScript = {
    Normal: 1,
    Super: 2,
    Sub: 3
};

export var UnderlineStyle = {
    None: 0,
    Solid: 1,
    Dotted: 2,
    Dashed: 3
};

export var ContentBehavior = {
    Original: 0,
    Stretch: 1,
    Scale: 2
}

export var StyleType = {
    Visual: 1,
    Text: 2
}

export var ActionType = {
    GoToPage: 0,
    GoBack: 1
}

export var AnimationType = {
    SlideLeft: 0,
    SlideRight: 1,
    SlideUp: 2,
    SlideDown: 3,
    Dissolve: 4
}

export var EasingType = {
    None: 0,
    EaseOut: 2,
    EaseIn: 3,
    EaseInOut: 4
}

export var ActionEvents = {
    click: 0,
    mousemove: 1,
    mousedown: 2,
    mouseup: 3,
    mouseenter: 4,
    mouseleave: 5,
    dblclick: 6
}

export var Devices = [
    {name: "Responsive"},
    {name: "iPhone 6 (375 x 667)", w: 375, h: 667},
    {name: "iPhone 6 Plus (414 x 736)", w: 414, h: 736},
    {name: "iPhone 5 (320 x 568)", w: 320, h: 568},
    {name: "iPad (768 x 1024)", w: 768, h: 1024},
    {name: "Galaxy S5 (360 x 640)", w: 360, h: 640},
    {name: "Nexus 5X (411 x 731)", w: 411, h: 731},
    {name: "Nexus 6P (435 x 773)", w: 435, h: 773}
];

export var StoryType = {
    flow:0,
    prototype:1
};

export var ContentSizing = {
    fill: 1,
    fit: 2,
    stretch: 3,
    center: 4,
    original: 5,
    manual: 6
};

export var ElementState = {
    Resize: 0,
    Edit: 1
};

export var Types = {
    'Path': 'p',
    'Text': 't',
    'Element': 'e', // UIElement
    'Container': 'w',
    'Brush': 'b',
    'Font': 'f',
    'Artboard': 'a',
    'ArtboardFrame': 'af',
    'Anchor': 'n',
    'CorruptedElement': 'x',
    'DraggingElement': 'd',
    'Frame': 'F',
    'FrameSource': 'I',
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
    'NoSelectionElement': 'N',
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
    'Shadow': 'i'
};

if (DEBUG){
    var map = {};
    for (var t in Types){
        var c = Types[t];
        if (map.hasOwnProperty(c)){
            throw new Error("Duplicate type code " + c);
        }
        map[c] = true;
    }
}

export var StrokePosition = {
    Center:0,
    Inside:1,
    Outside:2
};

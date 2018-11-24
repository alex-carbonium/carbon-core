//TODO: change all enum to const enum when all files are migrated

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

export enum ArrangeStrategies {
    Canvas,
    VerticalStack,
    HorizontalStack,
    Dock,
    Align,
    Repeat,
    Group
};

export enum DropPositioning {
    None,
    Vertical,
    Horizontal
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

export enum ActionType {
    GoToPage = 0,
    GoBack = 1
}

export type ActionEvents =
    "click" |
    "mousemove" |
    "mousedown" |
    "mouseup" |
    "mouseenter" |
    "mouseleave" |
    "mousewheel" |
    "dblclick" |
    "panstart" |
    "panend" |
    "panmove" |
    "pinchstart" |
    "pinch" |
    "pinchend"|
    "tap"|
    "doubletap";


export var Devices = [
    { name: "Responsive" },
    { name: "iPhone 8 (375 x 667)", w: 375, h: 667 },
    { name: "iPhone 8 Plus (414 x 736)", w: 414, h: 736 },
    { name: "iPhone SE (320 x 568)", w: 320, h: 568 },
    { name: "iPad (768 x 1024)", w: 768, h: 1024 },
    { name: "Galaxy S5 (360 x 640)", w: 360, h: 640 },
    { name: "Nexus 5X (411 x 731)", w: 411, h: 731 },
    { name: "Nexus 6P (435 x 773)", w: 435, h: 773 }
];

export enum MirrorViewMode {
    OriginalSize = 0,
    Fit = 1
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
    'VerticalStackContainer': 'vg',
    'HorizontalStackContainer': 'hg',
    'CanvasContainer': 'cg',
    'InteractiveContainer': 'ig',
    'App': 'A',
    'Guide': 'H',
    'CustomGuide': 'C',
    'LayoutGridColumns': 'L',
    'LayoutGridLines': 'O',
    'Symbol': 'T',
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
    'QuadAndLock': 'q',
    'Box': 'B',
    'Shadow': 'i',
    'IconSetCell': 'isc',
    'File': '*'
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

export var FloatingPointPrecision = 10;
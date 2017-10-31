import globals from "./globals";

var settings = {
    ruler: {
        "size": 14,
        "artboard_fill": "rgba(255,255,255,.3)",
        "overlay_fill": "#b7babd",
        "overlay_opacity": 0.7,
        "tick_minor_size": 2,
        "font_size": 9,
        "tick_stroke": "#ccc",
        "label_stroke": "#444",
        "selection_label_fill": "#a6a5ad",
        "selection_value_fill": "#59235d",
        "selection_edge_fill": "#59235d",
        "selection_fill": "rgba(89, 35, 93, 0.19)"
    },
    general: {
        // set in css
        pageFill: "#b7babd",
        boundaryDash: [4, 4],
        boundaryStroke: "#ccc",
    },
    guides: {
        stroke: "#9918ff"
    },
    group: {
        active_stroke: "#9918ff",
        editInIsolationMode: true
    },
    frame: {
        stroke: '#22c1ff',
        prototypingFill: 'rgba(17, 117, 186, 0.2)'
    },
    snapTo: {
        distanceColor: 'magenta',
        snapColor: 'cyan',
        enabled: true,
        pixels: true,
        columns: true,
        grid:true,
        guides: true,
        lockedObjects: true,
        onlyVisibleObjects: true
    },

    selection: {
        frameColor: "rgba(150,180, 250, 0.3)"
    },

    zoom: {
        frameColor: "rgba(150,150, 150, 0.3)"
    },

    shapes: {
        defaultFill: "#B6B6B6",
        defaultStroke: "black"
    },

    text: {
        defaultText: "Your text here",
        selectOnDblClick: true,
        insertNewOnClickOutside: false
    },

    image: {
        emptyFill: "#DEDEDE",
        emptyTextFill: "#444"
    },

    path: {
        pointStroke: "#1592E6",
        editPathStroke: "rgba(100,100,255,0.5)",
        pointFill: "#fff",
        pointFillFirstPoint: "yellow",
        editPointSize: 4,
        editHandleSize: 3
    },

    repeater: {
        marginFill: "pink"
    },

    internal: {
        showRotateAreas: false
    },

    save() {
        // TODO: save setting changes
    }
};

globals.userSettings = settings;

export default settings;
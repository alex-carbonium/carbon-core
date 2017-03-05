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
    guides: {
        stroke: "#9918ff"
    },
    group: {
        active_stroke: "#9918ff"
    },
    frame: {
        stroke: '#22c1ff'
    },
    showBoundingBoxes: false,
    snapTo: {
        enabled: true,
        pixels: true,
        columns: true,
        guides: true,
        objectCorners: true,
        objectCenters: true,
        lockedObjects: false
    },

    internal: {
        showRotateAreas: false
    }
};

globals.userSettings = settings;

export default settings;
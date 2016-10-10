define(function(){
    var fwk = sketch.framework;
    
    fwk.devicePreviewOptions = {
        addZoomFitGutters: true,
        fitWidthOnly: false,
        maxAutoScale: undefined,
        anchorX: "center",
        anchorY: "center",
        gutterX: 0,
        gutterY: 0
    };
    fwk.devices = {
        'iPhone 2, 3GS': {
            width:320,
            height: 480,
            visible:false,
            frame: "ui.iphone.templates.iPhoneTemplate"
        },
        "iPad":{
            width:768,
            height:1024,
            visible:false,
            frame: "ui.iphone.templates.iPadTemplate"
        },
        "iPad(Retina)": {
            width:1536,
            height:2048,
            visible:false,
            frame: "ui.iphone.templates.iPadTemplate"
        },
        'iPhone 5, 5s':{
            width: 640,
            height: 1136,
            frame: 'ui.ios.templates.iPhone6'
        },
        'iPhone 6':{
            width: 750,
            height: 1334,
            frame: 'ui.ios.templates.iPhone6'
        },
        'iPhone 6 Plus':{
            width:1080,
            height:1920,
            frame: 'ui.ios.templates.iPhone6'
        },
        'Apple Watch 38':{
            width:272,
            height:340,
            frame: 'ui.ios.templates.Watch'
        },
        'Apple Watch 42':{
            width:312,
            height:390,
            frame: 'ui.ios.templates.Watch'
        },
        'Android': {
            width:450,
            height:800,
            frame: 'ui.android.templates.GalaxyTemplate'
        },
        'Lumia': {
            width:480,
            height:800,
            frame: 'ui.wp8.templates.LumiaTemplate'
        },
        'Surface': {
            width:788,
            height:1366,
            frame: 'ui.win8.templates.SurfaceTemplate'
        },
        'Browser': {
            width:1024,
            height:768,
            frame: 'ui.web.templates.Browser',
            flexible:true,
            previewOptions: extend(true, {}, fwk.devicePreviewOptions, {
                fitWidthOnly: true,
                anchorY: "top",
                gutterY: 20,
                maxAutoScale: 1,
                keepPosition: true
            })
        },
        'None': {
            minWidth: 50,
            minHeight: 50,
            width:1024,
            height:768,            
            flexible:true,
            previewOptions: extend(true, {}, fwk.devicePreviewOptions, {
                keepPosition: true
            })
        }
    };

    var DeviceList = [];
    for(var name in fwk.devices) {
        if (name !== 'iPhone 2, 3GS' && name !== 'iPad'){
            DeviceList.push({name: name === 'iPad(Retina)' ? 'iPad' : name, value: name});
        }
        var device = fwk.devices[name];
        if (!device.previewOptions){
            device.previewOptions = extend(true, {}, fwk.devicePreviewOptions, {screenType: name});
        }
        else{
            device.previewOptions.screenType = name;
        }
         
        if (device.minWidth === undefined){
            device.minWidth = device.width;
        }
        if (device.minHeight === undefined){
            device.minHeight = device.height;
        }
    }

    return {
        DeviceList: DeviceList,
        DeviceSettings: fwk.devices
    }
});

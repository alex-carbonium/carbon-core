import globals from "./globals";

export const appInsightsEnabled = !!window['telemetryKey'];

if (!globals.appInsights){
    let {ApplicationInsights} = require("exports?Microsoft!applicationinsights-js/dist/ai.0");
    let serializer = new ApplicationInsights.Serializer();

    let snippet = {
        config: {
            instrumentationKey: window['telemetryKey'] || "nokey"
        }
    };
    var init = new ApplicationInsights.Initialization(snippet);
    globals.appInsights = init.loadAppInsights();
    globals.appInsights.context.addTelemetryInitializer(function(envelope){
        var telemetryItem = envelope.data.baseData;
        telemetryItem.properties = telemetryItem.properties || {};
        telemetryItem.properties.appBuild = window['appBuild'];

        if (envelope.data.baseType === "ExceptionData") {
            console.log(globals.appInsights.config.endpointUrl, ApplicationInsights.Serializer.serialize(envelope));
            return false;
        }
        return true;
    });

    if (!appInsightsEnabled) {
        globals.appInsights.config.disableTelemetry = true;
    }

    globals.appInsights.trackPageView();
}

export const appInsights = globals.appInsights;
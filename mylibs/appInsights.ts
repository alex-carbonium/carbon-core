import globals from "./globals";
import params from "./params";

export const appInsightsEnabled = !!window['telemetryKey'];

if (!globals.appInsights) {
    let { ApplicationInsights } = require("exports?Microsoft!applicationinsights-js/dist/ai.0");
    let serializer = new ApplicationInsights.Serializer();

    let snippet = {
        config: {
            instrumentationKey: window['telemetryKey'] || "nokey"
        }
    };
    var init = new ApplicationInsights.Initialization(snippet);
    globals.appInsights = init.loadAppInsights();
    globals.appInsights.context.addTelemetryInitializer(function (envelope) {
        var telemetryItem = envelope.data.baseData;
        telemetryItem.properties = telemetryItem.properties || {};
        telemetryItem.properties.appBuild = window['appBuild'];

        if (appInsightsEnabled && params.endpoints.error && envelope.data.baseType === "ExceptionData") {
            let payload = {
                url: globals.appInsights.config.endpointUrl,
                envelope: ApplicationInsights.Serializer.serialize(envelope)
            };
            fetch(params.endpoints.error, { body: JSON.stringify(payload), method: "POST", mode: "cors" });
            return true; //TODO: return false after testing
        }
        return true;
    });

    if (!appInsightsEnabled) {
        globals.appInsights.config.disableTelemetry = true;
    }

    globals.appInsights.trackPageView();
}

export const appInsights = globals.appInsights;
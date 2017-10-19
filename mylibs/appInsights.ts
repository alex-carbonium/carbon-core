import globals from "./globals";
import params from "./params";

export const appInsightsEnabled = !!window['telemetryKey'];

if (!globals.appInsights) {
    let { ApplicationInsights } = require("exports?Microsoft!applicationinsights-js/dist/ai");
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
            fetch(params.endpoints.error, {
                body: JSON.stringify(payload),
                headers: {
                    "Content-Type": "application/json"
                },
                method: "POST",
                mode: "cors"
            });
            return false;
        }
        return true;
    });

    if (!appInsightsEnabled) {
        globals.appInsights.config.disableTelemetry = true;
    }

    window.onerror = function(message: string, filename?: string, lineno?: number, colno?: number, error?:Error) {
        if (error && error.message !== "carbon-handled") {
            globals.appInsights.trackException(error);
            return;
        }

        //already handled or completely useless
        if (message == "carbon-handled" || message === "Script error." && !filename) {
            return;
        }

        //best effort for parsing
        let e = new Error(message);
        if (filename) {
            e.stack = `at ${filename}:${lineno}:${colno}`;
        }
        globals.appInsights.trackException(e);
    }
}

export const appInsights = globals.appInsights;
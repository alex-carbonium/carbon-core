import Log from 'oidc-client/src/Log';
import ErrorResponse from 'oidc-client/src/ErrorResponse';

export default class ResponseValidator {

    constructor(settings) {
        if (!settings) {
            Log.error("No settings passed to ResponseValidator");
            throw new Error("settings");
        }

        this._settings = settings;
    }

    validateSigninResponse(state, response) {
        Log.info("ResponseValidator.validateSigninResponse");

        return this._processSigninParams(state, response).then(response => {
            Log.info("state processed");
            return response;
        });
    }

    validateSignoutResponse(state, response) {
        Log.info("ResponseValidator.validateSignoutResponse");

        if (state.id !== response.state) {
            Log.error("State does not match");
            return Promise.reject(new Error("State does not match"));
        }

        // now that we know the state matches, take the stored data
        // and set it into the response so callers can get their state
        // this is important for both success & error outcomes
        Log.info("state validated");
        response.state = state.data;

        if (response.error) {
            Log.warn("Response was error", response.error);
            return Promise.reject(new ErrorResponse(response));
        }

        return Promise.resolve(response);
    }

    _processSigninParams(state, response) {
        Log.info("ResponseValidator._processSigninParams");

        if (state.id !== response.state) {
            Log.error("State does not match");
            return Promise.reject(new Error("State does not match"));
        }
        
        if (!state.client_id) {
            Log.error("No client_id on state");
            return Promise.reject(new Error("No client_id on state"));
        }
        
        if (!state.authority) {
            Log.error("No authority on state");
            return Promise.reject(new Error("No authority on state"));
        }
        
        // this allows the authority to be loaded from the signin state
        if (!this._settings.authority) {
            this._settings.authority = state.authority;
        }
        // ensure we're using the correct authority if the authority is not loaded from signin state
        else if (this._settings.authority && this._settings.authority !== state.authority) {
            Log.error("authority mismatch on settings vs. signin state");
            return Promise.reject(new Error("authority mismatch on settings vs. signin state"));
        }
        // this allows the client_id to be loaded from the signin state
        if (!this._settings.client_id) {
            this._settings.client_id = state.client_id;
        }
        // ensure we're using the correct client_id if the client_id is not loaded from signin state
        else if (this._settings.client_id && this._settings.client_id !== state.client_id) {
            Log.error("client_id mismatch on settings vs. signin state");
            return Promise.reject(new Error("client_id mismatch on settings vs. signin state"));
        }
        
        // now that we know the state matches, take the stored data
        // and set it into the response so callers can get their state
        // this is important for both success & error outcomes
        Log.info("state validated");
        response.state = state.data;

        if (response.error) {
            Log.warn("Response was error", response.error);
            return Promise.reject(new ErrorResponse(response));
        }

        if (state.nonce && !response.id_token) {
            Log.error("Expecting id_token in response");
            return Promise.reject(new Error("No id_token in response"));
        }

        if (!state.nonce && response.id_token) {
            Log.error("Not expecting id_token in response");
            return Promise.reject(new Error("Unexpected id_token in response"));
        }

        return Promise.resolve(response);
    }
}
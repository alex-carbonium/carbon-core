declare module "carbon-api"{
    export interface IBackend{
        servicesEndpoint: string;
        getAuthorizationHeaders(): any;
    }
}
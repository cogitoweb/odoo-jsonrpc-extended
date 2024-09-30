declare class ParamsCall {
    args?: any;
    kwargs?: any;
    method?: string;
    model?: string;
    context?: any;
}
declare class ParamsLogin {
    db?: string;
    login?: string;
    password?: string;
}
declare class ParamsEmpty {
}
type Params = ParamsCall | ParamsLogin | ParamsEmpty;
type Domain = (string | [string, string, any])[];
declare class Configs {
    odoo_server?: string;
    http_auth?: string;
}
export declare class OdooRPC {
    private odoo_server;
    private http_auth;
    private cookies;
    private shouldManageSessionId;
    private context;
    private headers;
    constructor();
    private buildRequest;
    private handleOdooErrors;
    init(configs: Configs): void;
    setOdooServer(odoo_server: string): void;
    setHttpAuth(http_auth: string): void;
    setCookie(session_id: string): void;
    sendRequest(url: string, params: Params): Promise<any>;
    getServerInfo(): Promise<any>;
    getSessionInfo(): Promise<any>;
    login(db: string, login: string, password: string): Promise<any>;
    isLoggedIn(force?: boolean): Promise<boolean>;
    logout(force?: boolean): Promise<any>;
    getDbList(): Promise<any>;
    updateContext(context: any): Promise<void>;
    getContext(): any;
    getServer(): string;
    call(model: string, method: string, args: any[], kwargs: any): Promise<any>;
    searchRead(model: string, params?: {
        domain?: Domain;
        context?: any;
        fields?: string[];
        offset?: number;
        limit?: number;
        order?: string;
    }): Promise<any>;
    searchCount(model: string, params?: {
        domain?: Domain;
        context?: any;
    }): Promise<number>;
    search(model: string, params?: {
        domain?: Domain;
        context?: any;
        fields?: string[];
        offset?: number;
        limit?: number;
        order?: string;
    }): Promise<number[]>;
    read(model: string, ids: number | number[], params?: {
        context?: any;
        fields?: string[];
    }): Promise<any>;
    fieldsGet(model: string, params?: {
        context?: any;
        fields?: string[];
        attributes?: string[];
    }): Promise<any>;
    create(model: string, data: any, params?: {
        context?: any;
    }): Promise<number>;
    write(model: string, ids: number | number[], data: any, params?: {
        context?: any;
    }): Promise<true>;
    unlink(model: string, ids: number | number[], params?: {
        context?: any;
    }): Promise<true>;
}
export {};

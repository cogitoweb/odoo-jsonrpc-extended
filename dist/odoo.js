import got from "got";
// import got from "got";
import { LocalStorage } from "node-localstorage";
class Cookies {
    constructor() {
        this.session_id = null;
    }
    delete_sessionId() {
        this.session_id = null;
    }
    get_sessionId() {
        return this.session_id || "";
    }
    set_sessionId(val) {
        this.session_id = val;
    }
}
class ParamsCall {
}
class ParamsLogin {
}
class ParamsEmpty {
}
class ErrorObj extends Error {
    constructor(message, title) {
        super();
        this.name = "errorObj";
        this.title = title;
        this.message = message;
    }
    toString() {
        return "Title: " + this.title + "; Message: " + this.message;
    }
}
class Configs {
}
const localStorage = new LocalStorage("./memory");
export class OdooRPC {
    constructor() {
        this.odoo_server = "";
        this.http_auth = null;
        this.shouldManageSessionId = false; // try without first
        this.context = JSON.parse(localStorage.getItem("user_context") ?? "null") || { lang: "en_US" };
        this.headers = null;
        this.cookies = new Cookies();
    }
    buildRequest(params) {
        if (this.shouldManageSessionId) {
            params.session_id = this.cookies.get_sessionId();
        }
        this.headers = {
            "Content-Type": "application/json",
            "X-Openerp-Session-Id": this.cookies.get_sessionId(),
            // Authorization: "Basic " + Buffer.from(this.http_auth!, "base64"), // + btoa(`${this.http_auth}`),
        };
        if (this.http_auth)
            this.headers.Authorization =
                "Basic " + Buffer.from(this.http_auth, "base64");
        return JSON.stringify({
            jsonrpc: "2.0",
            method: "call",
            params: params, // payload
        });
    }
    handleOdooErrors(response) {
        // console.log(response);
        if (!response.error)
            return response.result;
        const error = response.error;
        const errorObj = new ErrorObj("", "    ");
        if (error.code === 200 &&
            error.message === "Odoo Server Error" &&
            error.data.name === "werkzeug.exceptions.NotFound") {
            errorObj.title = "page_not_found";
            errorObj.message = "HTTP Error";
        }
        else if ((error.code === 100 && error.message === "Odoo Session Expired") || // v8
            (error.code === 300 &&
                error.message === "OpenERP WebClient Error" &&
                error.data.debug.match("SessionExpiredException")) // v7
        ) {
            errorObj.title = "session_expired";
            this.cookies.delete_sessionId();
        }
        else if (error.message === "Odoo Server Error" &&
            RegExp('/FATAL: {2}database "(.+)" does not exist/').test(error.data.message)) {
            errorObj.title = "database_not_found";
            errorObj.message = error.data.message;
        }
        else if (error.data.name === "openerp.exceptions.AccessError") {
            errorObj.title = "AccessError";
            errorObj.message = error.data.message;
        }
        else {
            const split = ("" + error.data.fault_code).split("\n")[0].split(" -- ");
            if (split.length > 1) {
                error.type = split.shift();
                error.data.fault_code = error.data.fault_code.substr(error.type.length + 4);
            }
            if (error.code === 200 && error.type) {
                errorObj.title = error.type;
                errorObj.message = error.data.fault_code.replace(/\n/g, "<br />");
            }
            else {
                errorObj.title = error.message;
                errorObj.message = error.data.debug.replace(/\n/g, "<br />");
            }
        }
        throw new Error(errorObj.toString());
    }
    init(configs) {
        this.odoo_server = configs.odoo_server || "";
        this.http_auth = configs.http_auth || null;
    }
    setOdooServer(odoo_server) {
        this.odoo_server = odoo_server;
    }
    setHttpAuth(http_auth) {
        this.http_auth = http_auth;
    }
    setCookie(session_id) {
        this.cookies.set_sessionId(session_id);
    }
    async sendRequest(url, params) {
        const body = this.buildRequest(params);
        // console.log("body", body, this.headers);
        const result = await got
            .post(this.odoo_server + url, {
            responseType: "json",
            headers: this.headers,
            body,
        })
            .json();
        return this.handleOdooErrors(result);
    }
    getServerInfo() {
        return this.sendRequest("/web/webclient/version_info", {});
    }
    getSessionInfo() {
        return this.sendRequest("/web/session/get_session_info", {});
    }
    async login(db, login, password) {
        const params = {
            db: db,
            login: login,
            password: password,
        };
        const result = await this.sendRequest("/web/session/authenticate", params);
        if (!result.uid) {
            this.cookies.delete_sessionId();
            throw new Error("Username and password don't match");
        }
        if (JSON.stringify(this.context) != JSON.stringify(result.user_context)) {
            this.context = result.user_context;
            localStorage.setItem("user_context", JSON.stringify(this.context));
        }
        this.cookies.set_sessionId(result.session_id);
        return result;
    }
    async isLoggedIn(force = true) {
        if (!force) {
            return this.cookies.get_sessionId().length > 0;
        }
        const result = await this.getSessionInfo();
        this.cookies.set_sessionId(result.session_id);
        return !!result.uid;
    }
    async logout(force = true) {
        this.cookies.delete_sessionId();
        if (force) {
            const result = await this.getSessionInfo();
            if (result.db) {
                return await this.login(result.db, "", "");
            }
            return null;
        }
        else {
            return [];
        }
    }
    getDbList() {
        // only use for odoo < 9.0
        return this.sendRequest("/web/database/get_list", {});
    }
    updateContext(context) {
        this.context = context;
        localStorage.setItem("user_context", JSON.stringify(context));
        const args = [[this.context.uid], context];
        return this.call("res.users", "write", args, {});
    }
    getContext() {
        return this.context;
    }
    getServer() {
        return this.odoo_server;
    }
    call(model, method, args, kwargs) {
        kwargs = kwargs || {};
        kwargs.context = kwargs.context || {};
        Object.assign(kwargs.context, this.context);
        const params = {
            model: model,
            method: method,
            args: args,
            kwargs: kwargs,
        };
        return this.sendRequest("/web/dataset/call_kw", params);
    }
    searchRead(model, params) {
        params = params || {};
        return this.call(model, "search_read", [params.domain || []], {
            context: params.context || this.context,
            fields: params.fields,
            offset: params.offset || 0,
            limit: params.limit || 0,
            order: params.order,
        });
    }
    searchCount(model, params) {
        params = params || {};
        return this.call(model, "search_count", [params.domain || []], {
            context: params.context || this.context,
        });
    }
    search(model, params) {
        params = params || {};
        return this.call(model, "search", [params.domain || []], {
            context: params.context || this.context,
            fields: params.fields,
            offset: params.offset || 0,
            limit: params.limit || 0,
            order: params.order,
        });
    }
    read(model, ids, params) {
        params = params || {};
        if (!Array.isArray(ids))
            ids = [ids];
        return this.call(model, "read", [ids], {
            context: params.context || this.context,
            fields: params.fields,
        });
    }
    fieldsGet(model, params) {
        params = params || {};
        return this.call(model, "fields_get", [params.fields || []], {
            context: params.context || this.context,
            attributes: params.attributes || ["string", "help", "type"],
        });
    }
    create(model, data, params) {
        params = params || {};
        return this.call(model, "create", [data], {
            context: params.context || this.context,
        });
    }
    write(model, ids, data, params) {
        if (!Array.isArray(ids))
            ids = [ids];
        params = params || {};
        return this.call(model, "write", [ids, data], {
            context: params.context || this.context,
        });
    }
    unlink(model, ids, params) {
        if (!Array.isArray(ids))
            ids = [ids];
        params = params || {};
        return this.call(model, "unlink", [ids], {
            context: params.context || this.context,
        });
    }
}

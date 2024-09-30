# Node-Odoo-Jsonrpc

OdooRPC for node.js
Inspired from [node-odoo-jsonrpc](https://socket.dev/npm/package/node-odoo-jsonrpc)

## Installation


## Functions list

- `login(db, user, pass)`
- `setCookie(session_id)`
- `logout(force)`
- `getDbList()`
- `searchRead(model, domain, fields, limit, offset, context)`
- `call(model, method, args, kwargs)`

## How to use

Import `Odoo`

```typescript
import { Odoo } from "node-odoo-jsonrpc";
```

Initialize configuration in `constructor` of component

```typescript
const odooRPC = new Odoo();
odooRPC.init({
  odoo_server: "https://odoo-server-example",
  http_auth: "username:password", // optional
});
try {
  await odooRPC.login("db_example", "username", "password");
  console.log("login success");
} catch (err) {
  console.error("login failed", err);
}
```

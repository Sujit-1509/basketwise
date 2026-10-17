import { writeFileSync } from "node:fs";
const csrf = {
  listen: "prerequest",
  script: {
    type: "text/javascript",
    exec: [
      "if (['POST','PUT','DELETE'].includes(pm.request.method)) {",
      "  pm.sendRequest(pm.collectionVariables.get('baseUrl') + '/api/auth/csrf', (err, res) => {",
      "    if (err) throw err; const csrf = res.json(); pm.request.headers.upsert({key:csrf.headerName,value:csrf.token});",
      "  });",
      "}",
    ],
  },
};
const body = {
  locality: "Kothrud",
  budget: 50000,
  items: [
    { productId: 2, quantity: 1 },
    { productId: 3, quantity: 2 },
  ],
};
function req(name, method, path, value, extra = [], status = 200) {
  return {
    name,
    request: {
      method,
      header: value ? [{ key: "Content-Type", value: "application/json" }] : [],
      url: "{{baseUrl}}" + path,
      ...(value
        ? { body: { mode: "raw", raw: JSON.stringify(value, null, 2) } }
        : {}),
    },
    event: [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: [
            `pm.test('Expected status', () => pm.response.to.have.status(${status}));`,
            ...extra,
          ],
        },
      },
    ],
  };
}
const register = req(
  "1 Register shopper",
  "POST",
  "/api/auth/register",
  {
    name: "Postman Shopper",
    email: "{{shopperEmail}}",
    password: "{{shopperPassword}}",
  },
  [],
  201,
);
register.event.push({
  listen: "prerequest",
  script: {
    type: "text/javascript",
    exec: [
      "pm.collectionVariables.set('shopperEmail', 'postman-'+Date.now()+'@example.test');",
    ],
  },
});
const login = req("2 Sign in", "POST", "/api/auth/login");
login.request.header = [
  { key: "Content-Type", value: "application/x-www-form-urlencoded" },
];
login.request.body = {
  mode: "urlencoded",
  urlencoded: [
    { key: "email", value: "{{shopperEmail}}" },
    { key: "password", value: "{{shopperPassword}}" },
  ],
};
const collection = {
  info: {
    name: "Basketwise CS3111",
    description:
      "Run the Shopper workflow folder against the local app. Postman keeps session cookies. Collection pre-request scripts fetch CSRF tokens before writes. All monetary values are paise. Use the separate Admin folder only after setting private admin variables; no real credentials are embedded.",
    schema:
      "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  variable: [
    { key: "baseUrl", value: "http://localhost:18080" },
    { key: "shopperEmail", value: "" },
    { key: "shopperPassword", value: "postman-demo-only-123" },
    { key: "adminEmail", value: "" },
    { key: "adminPassword", value: "" },
  ],
  event: [csrf],
  item: [
    {
      name: "Shopper workflow",
      item: [
        register,
        login,
        req("3 Current account", "GET", "/api/auth/me"),
        req("4 Catalog", "GET", "/api/catalog?locality=Kothrud"),
        req(
          "5 Save list",
          "POST",
          "/api/lists",
          { name: "Postman weekly list", ...body },
          ["pm.collectionVariables.set('listId', pm.response.json().list.id);"],
          201,
        ),
        req("6 Compare", "POST", "/api/comparisons", body, [
          "const basket=pm.response.json().bestSingle; pm.test('Complete basket exists',()=>pm.expect(basket.complete).to.eql(true)); pm.collectionVariables.set('basketKey',basket.key);",
        ]),
        req(
          "7 Save plan",
          "POST",
          "/api/plans",
          { name: "Postman basket", request: body, basketKey: "{{basketKey}}" },
          [],
          201,
        ),
        req("8 List saved snapshots", "GET", "/api/plans"),
        req("9 Personal suggestions", "GET", "/api/suggestions"),
        req(
          "10 Publish feedback",
          "POST",
          "/api/reviews",
          {
            targetType: "PRODUCT",
            targetId: 2,
            rating: 4,
            comment: "Clear item prices and store fees.",
          },
          [],
          201,
        ),
        req("11 Delete list", "DELETE", "/api/lists/{{listId}}"),
        req("12 Sign out", "POST", "/api/auth/logout"),
      ],
    },
    {
      name: "Public checks",
      item: [
        req("Health", "GET", "/actuator/health"),
        req("Discover service areas", "GET", "/api/localities"),
        req("No locality coverage", "GET", "/api/catalog?locality=Baner"),
      ],
    },
    {
      name: "Admin optional",
      item: [
        {
          ...login,
          name: "Sign in as administrator",
          request: {
            ...login.request,
            body: {
              mode: "urlencoded",
              urlencoded: [
                { key: "email", value: "{{adminEmail}}" },
                { key: "password", value: "{{adminPassword}}" },
              ],
            },
          },
        },
        req("Admin catalog", "GET", "/api/admin/catalog"),
      ],
    },
  ],
};
writeFileSync(
  new URL("../docs/Basketwise.postman_collection.json", import.meta.url),
  JSON.stringify(collection, null, 2) + "\n",
);
console.log("Wrote Postman collection.");

// Shared test setup. Tests never touch MySQL: installFakeDb() puts a stand-in
// for config/db.js into Node's module cache, so every module that requires
// it afterwards gets the fake. Each test file runs in its own process
// (node --test), so require this file before the code under test.

const path = require("path");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const fakeDb = {
  queries: [],
  // Replace per test: (sql, params) => what db.query should resolve to.
  respond: () => [[]],
  async query(sql, params) {
    this.queries.push({ sql, params });
    return this.respond(sql, params);
  },
  // A pooled connection for code that runs a database transaction; its
  // queries go through respond() too, and steps holds begin/commit/rollback.
  steps: [],
  async getConnection() {
    const step = (name) => async () => this.steps.push(name);
    return {
      query: (sql, params) => this.query(sql, params),
      beginTransaction: step("begin"),
      commit: step("commit"),
      rollback: step("rollback"),
      release: () => this.steps.push("release"),
    };
  },
  reset() {
    this.queries = [];
    this.steps = [];
    this.respond = () => [[]];
  },
};

const installFakeDb = () => {
  const dbPath = path.resolve(__dirname, "../config/db.js");
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: fakeDb };
  return fakeDb;
};

const tokenFor = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

// A minimal Express-style response that records what the handler sent.
const fakeRes = () => {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

module.exports = { installFakeDb, tokenFor, fakeRes };

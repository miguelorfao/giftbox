const test = require("node:test");
const assert = require("node:assert/strict");
const { connectToDatabase } = require("../src/db");

test("requires MySQL connection settings before opening the database", async () => {
  await assert.rejects(
    connectToDatabase({}),
    /MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE are required/,
  );
});

require("dotenv").config();

const { createApi } = require("./src/app");
const { connectToDatabase } = require("./src/db");

async function start() {
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminEmail || !adminPasswordHash || !process.env.JWT_SECRET) {
    throw new Error("ADMIN_EMAIL, ADMIN_PASSWORD_HASH, and JWT_SECRET are required.");
  }
  const { database } = await connectToDatabase();
  await database.ensureAdmin(adminEmail, adminPasswordHash);
  const app = createApi({ database, env: process.env });
  const port = Number(process.env.PORT || 5000);
  const server = app.listen(port, () => {
    console.log(`Giftbox API listening on port ${port}.`);
  });

  const close = async () => {
    server.close(async () => {
      await database.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

start().catch((error) => {
  console.error("Giftbox API could not start.", error.message);
  process.exitCode = 1;
});

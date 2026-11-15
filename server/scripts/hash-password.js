const bcrypt = require("bcryptjs");

if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
  console.error("Run this script in a terminal so the password can be entered without echo.");
  process.exit(1);
}

const input = process.stdin;
let password = "";
process.stdout.write("Admin password: ");
input.setRawMode(true);
input.resume();
input.setEncoding("utf8");

input.on("data", async (chunk) => {
  for (const character of chunk) {
    if (character === "\u0003") {
      process.stdout.write("\nCancelled.\n");
      process.exit(1);
    }
    if (character === "\r" || character === "\n") {
      const passwordBytes = Buffer.byteLength(password, "utf8");
      if (passwordBytes < 12 || passwordBytes > 72) {
        process.stdout.write("\nUse 12 to 72 UTF-8 bytes. Try again: ");
        password = "";
        continue;
      }
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      const hash = await bcrypt.hash(password, 12);
      process.stdout.write(`${hash}\n`);
      process.exit(0);
    }
    if (character === "\u0008" || character === "\u007f") {
      password = password.slice(0, -1);
      continue;
    }
    password += character;
  }
});

/*
  Generates the secrets Aczen AI Studio needs, for pasting into Vercel as
  SENSITIVE environment variables. Nothing is written to disk.

    node scripts/ai-studio-secrets.mjs            # random secrets only
    node scripts/ai-studio-secrets.mjs --admin    # also hash an admin password (prompted, not echoed)

  The admin hash uses the same format and parameters as AXE_GATE_HASH
  (scryptSync(password, 16-byte salt, 64), `saltHex:keyHex`), because it is
  verified by the same function.
*/
import { randomBytes, scryptSync } from "node:crypto";
import { stdin, stdout } from "node:process";

const secret = () => randomBytes(48).toString("base64url");

function readHidden(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt);
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.on("data", function onData(char) {
      if (char === "\r" || char === "\n" || char === "\u0004") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u0003") {
        process.exit(1);
      } else if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
      } else {
        value += char;
      }
    });
  });
}

const lines = [
  `AI_STUDIO_SESSION_SECRET=${secret()}`,
  `AI_STUDIO_ADMIN_SESSION_SECRET=${secret()}`,
  `AI_STUDIO_KEY_PEPPER=${secret()}`,
];

if (process.argv.includes("--admin")) {
  const password = await readHidden("Admin password: ");
  if (!password) {
    console.error("No password entered.");
    process.exit(1);
  }
  const salt = randomBytes(16);
  lines.push(`AI_STUDIO_ADMIN_PASSWORD_HASH=${salt.toString("hex")}:${scryptSync(password, salt, 64).toString("hex")}`);
}

console.log("\n" + lines.join("\n") + "\n");
console.log("WARNING: AI_STUDIO_KEY_PEPPER must never change after keys are issued: changing it invalidates every API key.");

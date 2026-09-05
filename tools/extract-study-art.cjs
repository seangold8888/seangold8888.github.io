"use strict";
// Lossless extraction of existing picnic images; no image generation or re-encoding.
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const root = path.resolve(__dirname, "..");
const original = path.join(root, "picnic/index.html");
const source = fs.existsSync(original) ? fs.readFileSync(original, "utf8")
  : cp.execFileSync("git", ["show", "83fafc6a160dc2e6716cad04786ce1c26567ba7b:picnic/index.html"], { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
const output = path.join(root, "assets/study");
fs.mkdirSync(output, { recursive: true });
const entries = [["picnic-scene", source.match(/--art:url\("data:image\/jpeg;base64,([^"\)]+)"\)/)?.[1]]];
for (const id of ["dad", "mom", "taeo", "jaei"]) {
  entries.push([id, source.match(new RegExp(id + ":\\s*'data:image/jpeg;base64,([^']+)'"))?.[1]]);
}
for (const [id, encoded] of entries) {
  if (!encoded) throw Error("Missing embedded image: " + id);
  const bytes = Buffer.from(encoded, "base64");
  if (bytes[0] !== 255 || bytes[1] !== 216) throw Error("Invalid JPEG: " + id);
  const target = path.join(output, id + ".jpg");
  if (fs.existsSync(target) && !fs.readFileSync(target).equals(bytes)) throw Error("Refusing to replace different asset: " + id);
  fs.writeFileSync(target, bytes);
  console.log(id + ".jpg: " + bytes.length + " bytes (original unchanged)");
}


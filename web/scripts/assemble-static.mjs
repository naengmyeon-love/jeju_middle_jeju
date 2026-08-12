import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const web = resolve(import.meta.dirname, "..");
const dist = resolve(web, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "assets"), { recursive: true });
await cp(resolve(web, "index.html"), resolve(dist, "index.html"));
await cp(resolve(web, "styles.css"), resolve(dist, "styles.css"));
await cp(resolve(web, "public"), dist, { recursive: true });

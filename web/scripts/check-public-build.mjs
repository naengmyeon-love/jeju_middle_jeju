import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const prohibited = /(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|HIGGSFIELD_API_KEY\s*=\s*[^\s"']+|TIMELY_AGENT_API_KEY\s*=\s*[^\s"']+)/;

async function files(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => entry.isDirectory() ? files(resolve(path, entry.name)) : [resolve(path, entry.name)]))).flat();
}

const findings = [];
for (const file of await files(dist)) {
  if (!/\.(?:html|js|json|md|txt)$/i.test(file)) continue;
  const content = await readFile(file, "utf8");
  if (prohibited.test(content)) findings.push(file);
}
if (findings.length) throw new Error(`공개 빌드에서 비밀값 패턴을 발견했습니다:\n${findings.join("\n")}`);
console.log("공개 빌드 비밀값 검사 통과");

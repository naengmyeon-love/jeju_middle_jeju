#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const projectRoot = resolve(import.meta.dirname, "..");
const configPath = resolve(projectRoot, "higgsfield.config.json");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(2);
}

async function loadOutputDirectory() {
  const raw = await readFile(configPath, "utf8");
  const config = JSON.parse(raw);
  if (!config.outputDir || typeof config.outputDir !== "string") {
    fail("higgsfield.config.json must contain outputDir.");
  }
  const outputDirectory = resolve(projectRoot, config.outputDir);
  if (!outputDirectory.startsWith(`${projectRoot}/`)) {
    fail("outputDir must stay inside the project.");
  }
  await mkdir(outputDirectory, { recursive: true });
  return outputDirectory;
}

function collectUrlCandidates(value, key = "", output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectUrlCandidates(item, key, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const [childKey, childValue] of Object.entries(value)) {
      collectUrlCandidates(childValue, childKey, output);
    }
    return output;
  }
  if (
    typeof value === "string" &&
    /^https:\/\//i.test(value) &&
    (/(video|result|output|download|raw|url)/i.test(key) ||
      /\.mp4(?:\?|$)/i.test(value))
  ) {
    output.push(value);
  }
  return output;
}

function filenameFromResponse(response, url) {
  const disposition = response.headers.get("content-disposition") ?? "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const responseName = encoded
    ? decodeURIComponent(encoded)
    : plain
      ? plain
      : basename(new URL(url).pathname);
  const safeStem = responseName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${safeStem || `higgsfield-${Date.now()}`}.mp4`;
}

async function uniquePath(directory, filename) {
  const extension = extname(filename) || ".mp4";
  const stem = basename(filename, extension);
  let candidate = resolve(directory, `${stem}${extension}`);
  for (let index = 2; ; index += 1) {
    try {
      await stat(candidate);
      candidate = resolve(directory, `${stem}-${index}${extension}`);
    } catch (error) {
      if (error.code === "ENOENT") return candidate;
      throw error;
    }
  }
}

async function downloadVideo(url, outputDirectory) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`download failed with HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("video/") && !/\.mp4(?:\?|$)/i.test(url)) {
    throw new Error(`result is not a video (${contentType || "unknown type"})`);
  }

  const destination = await uniquePath(
    outputDirectory,
    filenameFromResponse(response, url),
  );
  const temporary = `${destination}.part`;
  try {
    await pipeline(
      Readable.fromWeb(response.body),
      createWriteStream(temporary, { flags: "wx" }),
    );
    await rename(temporary, destination);
    return destination;
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function runHiggsfield(arguments_) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      "higgsfield",
      ["generate", "create", ...arguments_, "--wait", "--json"],
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ["inherit", "pipe", "inherit"],
      },
    );
    let stdout = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) resolvePromise(stdout);
      else rejectPromise(new Error(`higgsfield exited with status ${code}`));
    });
  });
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.length === 0 || arguments_.includes("--help")) {
    console.log(
      [
        "Usage:",
        "  npm run higgsfield:video -- <model> --prompt \"...\" [model options]",
        "",
        "The command waits for completion and saves the resulting MP4 under",
        "generated/videos/. It performs a real, potentially paid generation.",
      ].join("\n"),
    );
    return;
  }
  if (arguments_.includes("--wait") || arguments_.includes("--json")) {
    fail("--wait and --json are managed by this wrapper; do not pass them.");
  }

  const outputDirectory = await loadOutputDirectory();
  const stdout = await runHiggsfield(arguments_);
  let result;
  try {
    result = JSON.parse(stdout);
  } catch {
    fail("Higgsfield returned non-JSON output; no download was attempted.");
  }

  const urls = [...new Set(collectUrlCandidates(result))];
  if (urls.length === 0) {
    fail("No video result URL was found in the completed job.");
  }

  const failures = [];
  for (const url of urls) {
    try {
      const destination = await downloadVideo(url, outputDirectory);
      console.log(destination);
      return;
    } catch (error) {
      failures.push(error.message);
    }
  }
  fail(`No downloadable video result was found: ${failures.join("; ")}`);
}

main().catch((error) => fail(error.message));

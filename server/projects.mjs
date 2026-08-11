// 프로젝트 목록 조회.
//
// 승인 화면이 "어떤 프로젝트를 승인할지" 고르려면 목록이 필요하다. 화면이 경로를
// 직접 만들어 보내게 하면 그것이 곧 임의 경로 입력이 되므로, 여기서 슬러그만
// 오가게 하고 경로는 서버가 만든다.

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import { PROJECT_ROOT } from "./gate.mjs";

const PROJECTS_DIR = resolve(PROJECT_ROOT, "unsorted/outputs/projects");

/** 산출물 폴더 이름은 슬러그 형태만 허용한다. ../ 같은 것이 슬러그일 수 없다. */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/**
 * 슬러그를 제작 이력 경로로 바꾼다. 화면에서 온 값이 여기를 반드시 통과하므로
 * 경로 조작은 이 한 곳에서 막힌다.
 */
export function logPathForSlug(slug) {
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) return null;
  const relative = `unsorted/outputs/projects/${slug}/metadata/production-log.json`;
  const absolute = resolve(PROJECT_ROOT, relative);
  // 패턴을 통과해도 한 번 더 확인한다. 검증이 하나뿐이면 그 하나가 곧 단일 장애점이다.
  if (!absolute.startsWith(`${PROJECTS_DIR}/`)) return null;
  return relative;
}

export async function listProjects() {
  let entries;
  try {
    entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !SLUG_PATTERN.test(entry.name)) continue;

    const logPath = logPathForSlug(entry.name);
    if (!logPath) continue;

    // 이력을 못 읽어도 프로젝트를 목록에서 지우지 않는다. 승인 화면에서 "이력 없음"이
    // 보여야 담당자가 무엇이 빠졌는지 안다. 조용히 감추면 원인을 찾을 수 없다.
    let log = null;
    try {
      log = JSON.parse(await readFile(resolve(PROJECT_ROOT, logPath), "utf8"));
    } catch {
      /* 이력 없음 또는 깨진 JSON */
    }

    projects.push({
      slug: entry.name,
      logPath,
      hasLog: Boolean(log),
      topic: log?.input?.topic ?? null,
      characters: log?.input?.characters ?? [],
      status: log?.status ?? null,
      updatedAt: log?.updated_at ?? null,
    });
  }

  projects.sort((a, b) => b.slug.localeCompare(a.slug));
  return projects;
}

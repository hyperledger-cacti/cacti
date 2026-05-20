/**
 * Cacti Cleanup — Package Audit (LFX 2026 PoC)
 *
 * Walks every workspace declared in lerna.json and emits a per-package report
 * scoring concrete cleanup signals the cleanup initiative cares about:
 *
 *   - README presence and size (the e7cc7a6 backfill commit shows this is
 *     actively in flight)
 *   - Whether the package has a dedicated docs/docs/cactus/packages/<name>.md
 *   - Namespace prefix (cactus-* legacy vs cacti-* post-merge)
 *   - @deprecated markers in src
 *   - TODO / FIXME density in src
 *
 * The output (JSON + a Markdown summary) is exactly the artifact Phase 1 of
 * the implementation plan calls for — a baseline an LFX mentee can use to
 * pick concrete cleanup PRs from, and to measure progress against in Phase 6.
 *
 * Run: yarn ts-node tools/cleanup-audit/audit-packages.ts
 */

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { globby } from "globby";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_DIR = path.join(__dirname, "../../");
const lernaCfg: { packages: string[] } = await fs.readJSON(
  path.join(PROJECT_DIR, "lerna.json"),
);
const DOCS_PKG_DIR = path.join(PROJECT_DIR, "docs/docs/cactus/packages");
const OUT_DIR = path.join(PROJECT_DIR, "tools/cleanup-audit/out");

interface PackageAudit {
  name: string;
  dir: string;
  namespace: "cactus" | "cacti" | "weaver" | "other";
  hasReadme: boolean;
  readmeBytes: number;
  readmeIsStub: boolean;
  hasDocPage: boolean;
  deprecatedMarkers: number;
  todoMarkers: number;
  fixmeMarkers: number;
  srcFileCount: number;
  cleanupScore: number;
}

const STUB_README_BYTES = 2048;

function classifyNamespace(name: string): PackageAudit["namespace"] {
  if (name.startsWith("@hyperledger/cactus-") || name.startsWith("cactus-")) {
    return "cactus";
  }
  if (name.startsWith("@hyperledger/cacti-") || name.startsWith("cacti-")) {
    return "cacti";
  }
  if (name.includes("weaver") || name.includes("interoperation")) {
    return "weaver";
  }
  return "other";
}

async function countMatches(
  files: string[],
  patterns: RegExp[],
): Promise<number[]> {
  const totals = patterns.map(() => 0);
  for (const file of files) {
    let content: string;
    try {
      content = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }
    patterns.forEach((re, i) => {
      const m = content.match(re);
      if (m) totals[i] += m.length;
    });
  }
  return totals;
}

async function auditOne(pkgJsonPath: string): Promise<PackageAudit | null> {
  const pkgDir = path.dirname(pkgJsonPath);
  const absPkgDir = path.join(PROJECT_DIR, pkgDir);
  const pkgJson = await fs.readJSON(path.join(PROJECT_DIR, pkgJsonPath));
  const name: string = pkgJson.name ?? path.basename(pkgDir);
  const shortName = name.replace(/^@hyperledger\//, "");

  const readmePath = path.join(absPkgDir, "README.md");
  const hasReadme = await fs.pathExists(readmePath);
  const readmeBytes = hasReadme ? (await fs.stat(readmePath)).size : 0;

  const docPagePath = path.join(DOCS_PKG_DIR, `${shortName}.md`);
  const hasDocPage = await fs.pathExists(docPagePath);

  const srcFiles = await globby(
    ["src/**/*.{ts,tsx,js,go,rs,kt,java}"],
    { cwd: absPkgDir, absolute: true, gitignore: true },
  );

  const [deprecatedMarkers, todoMarkers, fixmeMarkers] = await countMatches(
    srcFiles,
    [/@deprecated/g, /\bTODO\b/g, /\bFIXME\b/g],
  );

  // Cleanup score: higher = more contributor-facing friction.
  // Weighted heuristic — easy to tune with maintainer feedback.
  const readmeGap = !hasReadme ? 5 : readmeBytes < STUB_README_BYTES ? 2 : 0;
  const docGap = !hasDocPage ? 3 : 0;
  const debtPenalty =
    deprecatedMarkers * 2 + Math.min(todoMarkers, 20) + fixmeMarkers * 2;
  const cleanupScore = readmeGap + docGap + debtPenalty;

  return {
    name,
    dir: pkgDir,
    namespace: classifyNamespace(name),
    hasReadme,
    readmeBytes,
    readmeIsStub: hasReadme && readmeBytes < STUB_README_BYTES,
    hasDocPage,
    deprecatedMarkers,
    todoMarkers,
    fixmeMarkers,
    srcFileCount: srcFiles.length,
    cleanupScore,
  };
}

function renderMarkdown(audits: PackageAudit[]): string {
  const total = audits.length;
  const missingReadme = audits.filter((a) => !a.hasReadme).length;
  const stubReadme = audits.filter((a) => a.readmeIsStub).length;
  const missingDoc = audits.filter((a) => !a.hasDocPage).length;
  const cactusNs = audits.filter((a) => a.namespace === "cactus").length;
  const cactiNs = audits.filter((a) => a.namespace === "cacti").length;
  const weaverNs = audits.filter((a) => a.namespace === "weaver").length;

  const top = [...audits]
    .sort((a, b) => b.cleanupScore - a.cleanupScore)
    .slice(0, 15);

  const rows = top
    .map(
      (a) =>
        `| ${a.name} | ${a.namespace} | ${a.hasReadme ? a.readmeBytes : "—"} | ${a.hasDocPage ? "✓" : "✗"} | ${a.deprecatedMarkers} | ${a.todoMarkers} | ${a.fixmeMarkers} | **${a.cleanupScore}** |`,
    )
    .join("\n");

  return `# Cacti Cleanup Audit — Baseline Report

_Generated by \`tools/cleanup-audit/audit-packages.ts\`._

## Summary

| Metric | Value |
|---|---|
| Workspaces audited | ${total} |
| Missing READMEs | ${missingReadme} |
| Stub READMEs (< ${STUB_README_BYTES} bytes) | ${stubReadme} |
| Missing docs/docs/cactus/packages/<name>.md page | ${missingDoc} |
| \`cactus-*\` namespace | ${cactusNs} |
| \`cacti-*\` namespace | ${cactiNs} |
| Weaver subtree workspaces | ${weaverNs} |

## Top 15 cleanup candidates (highest cleanupScore)

| Package | NS | README bytes | Doc page | @deprecated | TODO | FIXME | Score |
|---|---|---:|:---:|---:|---:|---:|---:|
${rows}

> The score is a heuristic combining README gap, missing doc page, and source
> debt markers. It is intended as a *prioritization aid for an LFX mentee or
> maintainer review* — not a quality verdict on the packages themselves.
`;
}

export async function auditPackages(): Promise<PackageAudit[]> {
  const TAG = "[tools/cleanup-audit/audit-packages]";
  const includeGlobs = lernaCfg.packages.map((p) => `${p}/package.json`);
  const pkgJsonPaths = await globby(includeGlobs, {
    cwd: PROJECT_DIR,
    ignore: ["**/node_modules/**"],
  });
  console.log(`${TAG} found ${pkgJsonPaths.length} workspaces`);

  const audits: PackageAudit[] = [];
  for (const p of pkgJsonPaths) {
    const a = await auditOne(p);
    if (a) audits.push(a);
  }

  audits.sort((a, b) => b.cleanupScore - a.cleanupScore);

  await fs.ensureDir(OUT_DIR);
  await fs.writeJSON(path.join(OUT_DIR, "audit.json"), audits, { spaces: 2 });
  await fs.writeFile(
    path.join(OUT_DIR, "audit.md"),
    renderMarkdown(audits),
    "utf8",
  );

  console.log(`${TAG} wrote ${OUT_DIR}/audit.json`);
  console.log(`${TAG} wrote ${OUT_DIR}/audit.md`);
  return audits;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  auditPackages().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

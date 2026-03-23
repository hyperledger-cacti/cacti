#!/usr/bin/env node

/**
 * Lints Copilot AI configuration files in .github/{agents,skills,instructions}.
 *
 * Checks performed:
 *   1. YAML frontmatter parses without errors
 *   2. Agent files have required fields: description, tools
 *   3. Agent handoff targets reference existing .agent.md files
 *   4. Skill `name` in frontmatter matches its directory name
 *   5. Instruction `applyTo` globs are syntactically plausible
 *   6. No duplicate agent or skill names
 *
 * Usage:
 *   node tools/ai-config-lint.mjs [--fix-names]
 *
 * Exit codes:
 *   0 — all checks pass
 *   1 — one or more errors found
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, basename, dirname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const AGENTS_DIR = join(ROOT, ".github", "agents");
const SKILLS_DIR = join(ROOT, ".github", "skills");
const INSTRUCTIONS_DIR = join(ROOT, ".github", "instructions");

const errors = [];
const warnings = [];

function err(file, msg) {
  errors.push(`ERROR  ${file}: ${msg}`);
}
function warn(file, msg) {
  warnings.push(`WARN   ${file}: ${msg}`);
}

// ---------------------------------------------------------------------------
// Minimal YAML frontmatter parser (no dependencies)
// Handles the subset used by Copilot config: scalars, arrays, objects
// ---------------------------------------------------------------------------

/**
 * Extracts the raw YAML text between the opening and closing `---` fences.
 * Returns null if the file doesn't start with `---` or has no closing fence.
 */
function extractFrontmatter(content) {
  const lines = content.split("\n");
  if (lines[0].trim() !== "---") return null;
  const endIdx = lines.indexOf("---", 1);
  if (endIdx === -1) return null;
  return lines.slice(1, endIdx).join("\n");
}

/**
 * Dependency-free YAML parser for the subset used by Copilot frontmatter.
 *
 * Supports:
 *   - Top-level `key: value` scalars (quoted or unquoted)
 *   - Inline arrays  `key: [a, b, c]`
 *   - Block arrays   `- item` and `- key: value` (one level of nesting)
 *   - Nested object properties inside array items (4+ space indent)
 *   - Booleans `true` / `false` inside nested objects
 *
 * Does NOT support:
 *   - Multi-line strings, anchors/aliases, flow mappings, nested arrays,
 *     or anything beyond the patterns actually used in .agent.md / SKILL.md
 *     / .instructions.md frontmatter today.
 *
 * @param {string} yaml  Raw YAML text (without the --- fences)
 * @returns {Record<string, unknown>}  Parsed key-value object
 */
function parseSimpleYaml(yaml) {
  const result = {};
  let currentKey = null;
  let currentArray = null;
  let currentObj = null;

  for (const line of yaml.split("\n")) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;

    // Top-level scalar: `key: value` or `key:` (empty → expect array/object)
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      // Flush any in-progress array before starting a new key
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
      }
      currentKey = kvMatch[1];
      currentArray = null;
      currentObj = null;

      const val = kvMatch[2].trim();
      if (val === "") {
        continue;
      }
      // Inline array: `tools: [read, edit, search]`
      if (val.startsWith("[") && val.endsWith("]")) {
        result[currentKey] = val
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        currentKey = null;
        continue;
      }
      // Quoted or bare scalar
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        result[currentKey] = val.slice(1, -1);
      } else {
        result[currentKey] = val;
      }
      currentKey = null;
      continue;
    }

    // Array item: `  - value` or `  - key: value` (start of nested object)
    const arrayMatch = line.match(/^\s+-\s+(.*)$/);
    if (arrayMatch && currentKey) {
      if (!currentArray) currentArray = [];
      const item = arrayMatch[1].trim();
      const objKv = item.match(/^(\w[\w-]*):\s*(.*)$/);
      if (objKv) {
        // First property of a new object inside the array
        currentObj = {};
        const objVal = objKv[2].trim();
        if (
          (objVal.startsWith('"') && objVal.endsWith('"')) ||
          (objVal.startsWith("'") && objVal.endsWith("'"))
        ) {
          currentObj[objKv[1]] = objVal.slice(1, -1);
        } else {
          currentObj[objKv[1]] = objVal;
        }
        currentArray.push(currentObj);
      } else {
        // Plain scalar array item
        currentArray.push(item);
        currentObj = null;
      }
      continue;
    }

    // Continuation property of an object inside an array (4+ space indent)
    // e.g.  `    agent: code-reviewer`
    const contMatch = line.match(/^\s{4,}(\w[\w-]*):\s*(.*)$/);
    if (contMatch && currentObj) {
      const val = contMatch[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        currentObj[contMatch[1]] = val.slice(1, -1);
      } else if (val === "true") {
        currentObj[contMatch[1]] = true;
      } else if (val === "false") {
        currentObj[contMatch[1]] = false;
      } else {
        currentObj[contMatch[1]] = val;
      }
      continue;
    }
  }

  // Flush any trailing array that wasn't followed by a new key
  if (currentKey && currentArray) {
    result[currentKey] = currentArray;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Collect files
// ---------------------------------------------------------------------------

/** Returns absolute paths to all files in `dir` ending with `ext`. */
function listFiles(dir, ext) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext) && !f.startsWith("."))
    .map((f) => join(dir, f));
}

/** Returns absolute paths to all subdirectories in `dir`. */
function listSkillDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => {
      const full = join(dir, f);
      return statSync(full).isDirectory() && !f.startsWith(".");
    })
    .map((f) => join(dir, f));
}

// ---------------------------------------------------------------------------
// Lint agents
// ---------------------------------------------------------------------------

/**
 * Validates every `*.agent.md` file in `.github/agents/`.
 *
 * For each agent file (skipping `_`-prefixed templates after frontmatter
 * parse check):
 *
 *   Check 1 — Frontmatter exists and parses.
 *             Every agent file must open with `---`, contain valid YAML,
 *             and close with `---`.
 *
 *   Check 2 — Required frontmatter fields.
 *             `description` (string) tells Copilot when to suggest the agent.
 *             `tools` (array) declares which tool categories the agent can use.
 *
 *   Check 3 — Agent name uniqueness.
 *             The agent name is derived from the filename (minus `.agent.md`).
 *             Two agents with the same name would shadow each other.
 *
 *   Check 4 — Handoff target integrity.
 *             Every `agent:` value inside the `handoffs` array must reference
 *             an existing `<name>.agent.md` file. This catches typos and
 *             stale references after renames/deletions. A missing `label:`
 *             triggers a warning (not an error) since it only affects UI text.
 */
function lintAgents() {
  const agentFiles = listFiles(AGENTS_DIR, ".agent.md");
  const realAgents = agentFiles.filter(
    (f) => !basename(f).startsWith("_"),
  );
  const agentNames = new Set();

  for (const file of agentFiles) {
    const rel = file.replace(ROOT + "/", "");
    const content = readFileSync(file, "utf8");
    const isTemplate = basename(file).startsWith("_");

    // Check 1: frontmatter exists and parses
    const fmRaw = extractFrontmatter(content);
    if (!fmRaw) {
      err(rel, "Missing or malformed YAML frontmatter (no --- delimiters)");
      continue;
    }

    let fm;
    try {
      fm = parseSimpleYaml(fmRaw);
    } catch (e) {
      err(rel, `Frontmatter parse error: ${e.message}`);
      continue;
    }

    if (isTemplate) continue;

    // Check 2: required fields
    if (!fm.description) {
      err(rel, 'Missing required field "description" in frontmatter');
    }
    if (!fm.tools) {
      err(rel, 'Missing required field "tools" in frontmatter');
    } else if (!Array.isArray(fm.tools)) {
      err(rel, '"tools" must be an array');
    }

    // Check 3: agent name uniqueness (derived from filename)
    const name = basename(file, ".agent.md");
    if (agentNames.has(name)) {
      err(rel, `Duplicate agent name: ${name}`);
    }
    agentNames.add(name);

    // Check 4: handoff targets point to existing agent files
    if (fm.handoffs && Array.isArray(fm.handoffs)) {
      for (const handoff of fm.handoffs) {
        if (!handoff.agent) {
          err(rel, "Handoff entry missing 'agent' field");
          continue;
        }
        const targetFile = join(AGENTS_DIR, `${handoff.agent}.agent.md`);
        if (!existsSync(targetFile)) {
          err(
            rel,
            `Handoff target "${handoff.agent}" not found (expected ${handoff.agent}.agent.md)`,
          );
        }
        if (!handoff.label) {
          warn(rel, `Handoff to "${handoff.agent}" missing "label" field`);
        }
      }
    }
  }

  return { agentNames, realAgents };
}

// ---------------------------------------------------------------------------
// Lint skills
// ---------------------------------------------------------------------------

/**
 * Validates every skill directory under `.github/skills/`.
 *
 * Each subdirectory is expected to contain a `SKILL.md` file.
 * Template directories (prefixed with `_`) are checked for frontmatter
 * parse-ability only.
 *
 *   Check 1 — SKILL.md exists.
 *             Every non-template skill directory must contain a SKILL.md.
 *
 *   Check 2 — Frontmatter exists and parses.
 *
 *   Check 3 — Required fields: `name` and `description`.
 *
 *   Check 4 — Name ↔ directory consistency.
 *             The `name` field in frontmatter must exactly match the
 *             directory name (e.g., `codeql-scanning/SKILL.md` must have
 *             `name: codeql-scanning`). Copilot resolves skills by
 *             directory name, so a mismatch means the skill won't be found.
 *
 *   Check 5 — Skill name uniqueness across all directories.
 */
function lintSkills() {
  const skillDirs = listSkillDirs(SKILLS_DIR);
  const skillNames = new Set();

  for (const dir of skillDirs) {
    const dirName = basename(dir);
    const isTemplate = dirName.startsWith("_");
    const skillFile = join(dir, "SKILL.md");
    const rel = skillFile.replace(ROOT + "/", "");

    // Check 1: SKILL.md must exist
    if (!existsSync(skillFile)) {
      if (!isTemplate) {
        err(
          dir.replace(ROOT + "/", ""),
          "Skill directory missing SKILL.md file",
        );
      }
      continue;
    }

    const content = readFileSync(skillFile, "utf8");

    // Check 2: frontmatter exists and parses
    const fmRaw = extractFrontmatter(content);
    if (!fmRaw) {
      err(rel, "Missing or malformed YAML frontmatter");
      continue;
    }

    let fm;
    try {
      fm = parseSimpleYaml(fmRaw);
    } catch (e) {
      err(rel, `Frontmatter parse error: ${e.message}`);
      continue;
    }

    if (isTemplate) continue;

    // Check 3: required fields
    if (!fm.name) {
      err(rel, 'Missing required field "name" in frontmatter');
    } else {
      // Check 4: name must match directory name
      if (fm.name !== dirName) {
        err(
          rel,
          `Skill name "${fm.name}" does not match directory name "${dirName}"`,
        );
      }
      // Check 5: uniqueness
      if (skillNames.has(fm.name)) {
        err(rel, `Duplicate skill name: ${fm.name}`);
      }
      skillNames.add(fm.name);
    }

    if (!fm.description) {
      err(rel, 'Missing required field "description" in frontmatter');
    }
  }
}

// ---------------------------------------------------------------------------
// Lint instructions
// ---------------------------------------------------------------------------

/**
 * Validates every `*.md` file in `.github/instructions/`.
 *
 * Instruction files use the `applyTo` frontmatter field to tell Copilot
 * which file paths should trigger the instruction (e.g.,
 * `applyTo: "**\/*.ts"` activates for all TypeScript files).
 *
 *   Check 1 — Frontmatter exists and parses.
 *
 *   Check 2 — Required fields: `description` and `applyTo`.
 *
 *   Check 3 — `applyTo` glob sanity.
 *             Warns if the glob uses backslashes (Windows-style paths don't
 *             work in GitHub Copilot) or contains no wildcards and no path
 *             separators (likely a bare filename that won't match anything).
 */
function lintInstructions() {
  const instrFiles = listFiles(INSTRUCTIONS_DIR, ".md");

  for (const file of instrFiles) {
    const rel = file.replace(ROOT + "/", "");
    const content = readFileSync(file, "utf8");

    // Check 1: frontmatter exists and parses
    const fmRaw = extractFrontmatter(content);
    if (!fmRaw) {
      err(rel, "Missing or malformed YAML frontmatter");
      continue;
    }

    let fm;
    try {
      fm = parseSimpleYaml(fmRaw);
    } catch (e) {
      err(rel, `Frontmatter parse error: ${e.message}`);
      continue;
    }

    // Check 2: required fields
    if (!fm.description) {
      err(rel, 'Missing required field "description" in frontmatter');
    }
    if (!fm.applyTo) {
      err(rel, 'Missing required field "applyTo" in frontmatter');
    } else {
      // Check 3: glob sanity
      const glob = fm.applyTo;
      if (glob.includes("\\") && !glob.includes("/")) {
        warn(rel, `applyTo "${glob}" uses backslashes — use forward slashes`);
      }
      if (!glob.includes("*") && !glob.includes("/")) {
        warn(
          rel,
          `applyTo "${glob}" has no wildcards or paths — may not match any files`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log("Linting Copilot AI configuration...\n");

console.log(`  Agents dir:       ${existsSync(AGENTS_DIR) ? AGENTS_DIR : "(not found)"}`);
console.log(`  Skills dir:       ${existsSync(SKILLS_DIR) ? SKILLS_DIR : "(not found)"}`);
console.log(`  Instructions dir: ${existsSync(INSTRUCTIONS_DIR) ? INSTRUCTIONS_DIR : "(not found)"}`);
console.log("");

lintAgents();
lintSkills();
lintInstructions();

// Print results
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const w of warnings) console.log(`  ${w}`);
  console.log("");
}

if (errors.length > 0) {
  console.log("Errors:");
  for (const e of errors) console.log(`  ${e}`);
  console.log("");
  console.log(`❌ ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
} else {
  const agentCount = listFiles(AGENTS_DIR, ".agent.md").filter(
    (f) => !basename(f).startsWith("_"),
  ).length;
  const skillCount = listSkillDirs(SKILLS_DIR).filter(
    (f) => !basename(f).startsWith("_"),
  ).length;
  const instrCount = listFiles(INSTRUCTIONS_DIR, ".md").length;
  console.log(
    `✅ All checks passed (${agentCount} agents, ${skillCount} skills, ${instrCount} instructions)`,
  );
  process.exit(0);
}

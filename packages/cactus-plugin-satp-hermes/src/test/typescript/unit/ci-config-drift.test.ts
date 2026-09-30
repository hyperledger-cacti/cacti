/**
 * CI config-drift guard tests.
 *
 * These tests are part of the standard unit suite, so CI runs them on every
 * PR that touches the package. They pin the docker image pre-pulls declared
 * in .github/workflows/satp-hermes-workflow.yaml to the exact image versions
 * used by the test environments in this package, so the CI workflow can
 * never silently drift away from what the suite actually runs (the bug class
 * observed on 2026-09-17: the workflow pre-pulled a dead
 * ghcr.io/hyperledger/besu-all-in-one image while the suite pins
 * ghcr.io/hyperledger-cacti/besu-all-in-one).
 *
 * Pins enforced here:
 *  - besu:     ghcr.io/hyperledger-cacti/besu-all-in-one:v3.0.1
 *              (source of truth:
 *              src/test/typescript/environments/besu-test-environment.ts,
 *              containerImageName/containerImageVersion at lines ~139-141)
 *  - geth:     ghcr.io/hyperledger-cacti/cactus-geth-all-in-one:v3.0.1
 *              (source of truth:
 *              src/test/typescript/environments/ethereum-test-environment.ts)
 *  - postgres: postgres:17.2
 *              (source of truth: src/test/typescript/test-utils.ts,
 *              createPGDatabase() imageFqn)
 *
 * Intentionally fail-loud design: if the workflow file changes shape such
 * that no docker-pull steps are found, the test FAILS (a guard that
 * silently passes on a shape change is worthless).
 */

import fs from "fs";
import path from "path";
import * as jsYaml from "js-yaml";

////////////////////////////////////////////////////////////////////////////////

// __dirname = <repo>/packages/cactus-plugin-satp-hermes/src/test/typescript/unit
const PACKAGE_ROOT = path.resolve(__dirname, "../../../..");
const REPO_ROOT = path.resolve(PACKAGE_ROOT, "../..");

const WORKFLOW_PATH = path.join(
  REPO_ROOT,
  ".github/workflows/satp-hermes-workflow.yaml",
);
const BUILD_WORKFLOW_PATH = path.join(
  REPO_ROOT,
  ".github/workflows/satp-hermes-build.yaml",
);
const BESU_ENV_PATH = path.join(
  PACKAGE_ROOT,
  "src/test/typescript/environments/besu-test-environment.ts",
);
const ETHEREUM_ENV_PATH = path.join(
  PACKAGE_ROOT,
  "src/test/typescript/environments/ethereum-test-environment.ts",
);
const TEST_UTILS_PATH = path.join(
  PACKAGE_ROOT,
  "src/test/typescript/test-utils.ts",
);

/**
 * The exact image versions the test suite itself uses. The workflow
 * pre-pulls must equal these (and the companion assertions re-derive them
 * from the environment sources so this file cannot drift from the suite).
 */
const EXPECTED_BESU_IMAGE = "ghcr.io/hyperledger-cacti/besu-all-in-one:v3.0.1";
const EXPECTED_GETH_IMAGE =
  "ghcr.io/hyperledger-cacti/cactus-geth-all-in-one:v3.0.1";

const DOCKER_PULL_ACTION_PREFIX = "./.github/actions/docker-pull";

/** The dead (non-cacti) besu image name that once leaked into the workflow. */
const DEAD_BESU_IMAGE_PREFIX = "ghcr.io/hyperledger/besu-all-in-one";

////////////////////////////////////////////////////////////////////////////////

interface IGhWorkflowStep {
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
}

interface IGhWorkflowJob {
  steps?: IGhWorkflowStep[];
}

interface IGhWorkflow {
  jobs?: Record<string, IGhWorkflowJob>;
}

interface IDockerPullRef {
  job: string;
  image: string;
}

function loadWorkflowYaml(filePath: string): IGhWorkflow {
  expect(fs.existsSync(filePath)).toBe(true);
  const raw = fs.readFileSync(filePath, "utf-8");
  // js-yaml is already a devDependency of this package (no new deps needed).
  return jsYaml.load(raw) as unknown as IGhWorkflow;
}

/**
 * Walks jobs[].steps[] and collects every step that uses the docker-pull
 * composite action, together with its `image:` input.
 */
function collectDockerPullRefs(workflow: IGhWorkflow): IDockerPullRef[] {
  const refs: IDockerPullRef[] = [];
  for (const [jobName, job] of Object.entries(workflow.jobs ?? {})) {
    (job.steps ?? []).forEach((step: IGhWorkflowStep, idx: number) => {
      if (
        typeof step.uses === "string" &&
        step.uses.startsWith(DOCKER_PULL_ACTION_PREFIX)
      ) {
        refs.push({
          job: `${jobName}#steps[${idx}]`,
          image: typeof step.with?.image === "string" ? step.with.image : "",
        });
      }
    });
  }
  return refs;
}

function collectImagesMatching(
  refs: IDockerPullRef[],
  needle: string,
): IDockerPullRef[] {
  return refs.filter((ref) => ref.image.includes(needle));
}

/**
 * Extracts the containerImageName/containerImageVersion literals declared by
 * a test environment source file (each environment file declares exactly
 * one pair).
 */
function extractEnvContainerImage(filePath: string): {
  imageName: string;
  imageVersion: string;
} {
  expect(fs.existsSync(filePath)).toBe(true);
  const raw = fs.readFileSync(filePath, "utf-8");
  const nameMatch = raw.match(/containerImageName:\s*"([^"]+)"/);
  const versionMatch = raw.match(/containerImageVersion:\s*"([^"]+)"/);
  expect(nameMatch).not.toBeNull();
  expect(versionMatch).not.toBeNull();
  return {
    imageName: nameMatch ? nameMatch[1] : "",
    imageVersion: versionMatch ? versionMatch[1] : "",
  };
}

/** Extracts the postgres imageFqn literal from test-utils.ts. */
function extractPostgresImageFqn(filePath: string): string {
  expect(fs.existsSync(filePath)).toBe(true);
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/const imageFqn = "(postgres:[^"]+)"/);
  expect(match).not.toBeNull();
  return match ? match[1] : "";
}

/** Reads every workspace package name under the repo's packages directory. */
function collectWorkspacePackageNames(): Set<string> {
  const packagesDir = path.join(REPO_ROOT, "packages");
  const names = new Set<string>();
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    const pkgJsonPath = path.join(packagesDir, entry.name, "package.json");
    if (!fs.existsSync(pkgJsonPath)) {
      continue;
    }
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    if (typeof pkgJson.name === "string") {
      names.add(pkgJson.name);
    }
  }
  return names;
}

/** Collects every `--scope=<value>` token used in run: strings of a workflow. */
function collectLernaScopes(workflow: IGhWorkflow): string[] {
  const scopes: string[] = [];
  for (const job of Object.values(workflow.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (typeof step.run !== "string") {
        continue;
      }
      for (const match of step.run.matchAll(/--scope=(\S+)/g)) {
        scopes.push(match[1]);
      }
    }
  }
  return scopes;
}

////////////////////////////////////////////////////////////////////////////////

describe("SATP-Hermes CI workflow docker-pull drift guard", () => {
  let workflow: IGhWorkflow;
  let dockerPullRefs: IDockerPullRef[];

  beforeAll(() => {
    workflow = loadWorkflowYaml(WORKFLOW_PATH);
    dockerPullRefs = collectDockerPullRefs(workflow);
  });

  it("workflow file exists and parses as YAML", () => {
    expect(workflow).toBeTruthy();
    expect(workflow.jobs).toBeTruthy();
    expect(Object.keys(workflow.jobs ?? {}).length).toBeGreaterThanOrEqual(1);
  });

  it("finds at least one docker-pull step (fail loudly if the file changes shape)", () => {
    // Guardrail sanity: if this fails, the workflow no longer pre-pulls
    // images via ./.github/actions/docker-pull/ (or the file was renamed /
    // restructured). The drift guards below are only meaningful while this
    // step shape exists, so we refuse to pass silently.
    expect(dockerPullRefs.length).toBeGreaterThanOrEqual(1);
    // Every docker-pull step must declare a non-empty string image input;
    // a missing/garbled `with: image:` would be exactly the silent-breakage
    // class these tests exist to prevent.
    for (const ref of dockerPullRefs) {
      expect(ref.image.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("never pre-pulls the dead ghcr.io/hyperledger/ besu image name", () => {
    const besuRefs = collectImagesMatching(dockerPullRefs, "besu-all-in-one");
    expect(besuRefs.length).toBeGreaterThanOrEqual(1);
    for (const ref of besuRefs) {
      expect(ref.image.startsWith(DEAD_BESU_IMAGE_PREFIX)).toBe(false);
    }
  });

  it("pins every besu pre-pull to the exact suite image", () => {
    const besuRefs = collectImagesMatching(dockerPullRefs, "besu-all-in-one");
    expect(besuRefs.length).toBeGreaterThanOrEqual(1);
    for (const ref of besuRefs) {
      expect(ref.image).toBe(EXPECTED_BESU_IMAGE);
    }
  });

  it("keeps besu-test-environment.ts in lockstep with the CI besu pre-pull", () => {
    // Cross-references src/test/typescript/environments/besu-test-environment.ts
    // (containerImageName / containerImageVersion, lines ~139-141): if this
    // pin is bumped there, the CI pre-pull must be bumped in the same change
    // (and the EXPECTED_BESU_IMAGE literal here updated explicitly).
    const env = extractEnvContainerImage(BESU_ENV_PATH);
    const envImageFqn = `${env.imageName}:${env.imageVersion}`;
    expect(envImageFqn).toBe(EXPECTED_BESU_IMAGE);

    const besuRefs = collectImagesMatching(dockerPullRefs, "besu-all-in-one");
    expect(besuRefs.length).toBeGreaterThanOrEqual(1);
    for (const ref of besuRefs) {
      expect(ref.image).toBe(envImageFqn);
    }
  });

  it("pins every geth pre-pull to the exact ethereum-test-environment.ts image", () => {
    const env = extractEnvContainerImage(ETHEREUM_ENV_PATH);
    const envImageFqn = `${env.imageName}:${env.imageVersion}`;
    expect(envImageFqn).toBe(EXPECTED_GETH_IMAGE);

    const gethRefs = collectImagesMatching(dockerPullRefs, "geth-all-in-one");
    expect(gethRefs.length).toBeGreaterThanOrEqual(1);
    for (const ref of gethRefs) {
      expect(ref.image).toBe(envImageFqn);
      expect(ref.image).toBe(EXPECTED_GETH_IMAGE);
    }
  });

  it("pins the postgres pre-pull to the image used by the suite (test-utils.ts)", () => {
    const suitePostgresImage = extractPostgresImageFqn(TEST_UTILS_PATH);
    expect(suitePostgresImage).toBe("postgres:17.2");

    const pgRefs = collectImagesMatching(dockerPullRefs, "postgres");
    expect(pgRefs.length).toBeGreaterThanOrEqual(1);
    for (const ref of pgRefs) {
      expect(ref.image).toBe(suitePostgresImage);
    }
  });
});

describe("SATP-Hermes build workflow lerna scope guard", () => {
  let buildWorkflow: IGhWorkflow;
  let scopes: string[];
  let workspacePackageNames: Set<string>;

  beforeAll(() => {
    buildWorkflow = loadWorkflowYaml(BUILD_WORKFLOW_PATH);
    scopes = collectLernaScopes(buildWorkflow);
    workspacePackageNames = collectWorkspacePackageNames();
  });

  it("build workflow exists and contains at least one lerna --scope (fail loudly otherwise)", () => {
    expect(buildWorkflow).toBeTruthy();
    // If this fails, the workflow stopped using `lerna ... --scope=` (or the
    // run: strings changed shape) and this guard needs to be revisited.
    expect(scopes.length).toBeGreaterThanOrEqual(1);
  });

  it("every lerna --scope value references an existing workspace package name", () => {
    // Catches scope typos generically: the scope must match the `name` field
    // of some packages/*/package.json, not a hand-typed guess.
    for (const scope of scopes) {
      expect(workspacePackageNames.has(scope)).toBe(true);
    }
  });

  it("builds/lints the satp-hermes package by its real package.json name", () => {
    const pkgJsonPath = path.join(PACKAGE_ROOT, "package.json");
    const pkgName = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8")).name;
    expect(typeof pkgName).toBe("string");
    expect(scopes).toContain(pkgName);
  });
});

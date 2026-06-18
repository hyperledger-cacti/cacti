import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const packageRoot = path.resolve(__dirname, "../../../../");
const nixBaseCommand =
  "nix --extra-experimental-features nix-command --extra-experimental-features flakes";

function hasNixInPath(): boolean {
  try {
    execSync("command -v nix", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("SATP Hermes Nix installation and setup", () => {
  it("has a SATP Hermes flake definition", () => {
    const satpFlakeFile = path.join(packageRoot, "flake.nix");
    expect(fs.existsSync(satpFlakeFile)).toBe(true);
  });

  it("validates flake commands when Nix is available", () => {
    if (!hasNixInPath()) {
      throw new Error("Nix must be available but it was not found.");
    }

    expect(() =>
      execSync(`${nixBaseCommand} flake show`, {
        cwd: packageRoot,
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  it("enters nix develop and exposes required toolchain", () => {
    if (!hasNixInPath()) {
      throw new Error("Nix must be available but it was not found.");
    }

    const verifyDevelopShell =
      `${nixBaseCommand} develop --command bash -lc ` +
      `'test -n "$IN_NIX_SHELL" && command -v node yarn go forge >/dev/null'`;

    expect(() =>
      execSync(verifyDevelopShell, {
        cwd: packageRoot,
        stdio: "pipe",
      }),
    ).not.toThrow();
  });
});

import { CDVC } from "check-dependency-version-consistency";
import esMain from "es-main";
import { exit } from "process";

export async function checkDependencyVersionConsistency(): Promise<
  [boolean, string[]]
> {
  const errors: string[] = [];
  const cdvc = new CDVC(process.cwd(), {
    fix: false,
  });
  errors.push(cdvc.toMismatchSummary());
  return [errors.length === 0, errors];
}

if (esMain(import.meta)) {
  const [success, dependencyMismatchSummary] =
    await checkDependencyVersionConsistency();
  if (!success) {
    console.log(`${dependencyMismatchSummary}`);
    exit(1);
  }
  exit(0);
}

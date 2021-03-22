import { Optional } from "typescript-optional";
import {
  Containers,
  IPruneDockerResourcesRequest,
  IPruneDockerResourcesResponse,
} from "../common/containers";
import { isRunningInGithubAction } from "./is-running-in-github-action";

/**
 * Github Actions started to run out of disk space recently (as of March, 2021) so we have this
 * hack here to attempt to free up disk space when running inside a VM of the CI system.
 * The idea is that tests can call this function before and after their execution so that
 * their container images/volumes get freed up.
 */
export async function pruneDockerAllIfGithubAction(
  req?: IPruneDockerResourcesRequest,
): Promise<Optional<IPruneDockerResourcesResponse>> {
  if (!isRunningInGithubAction()) {
    return Optional.empty();
  }
  console.log(
    "Detected current process to be running " +
      "inside a Github Action. Pruning all docker resources...",
  );
  const res = await Containers.pruneDockerResources(req);
  return Optional.of(res);
}

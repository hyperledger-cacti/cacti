import { Checks, IAsyncProvider, Objects } from "@hyperledger/cactus-common";
import {
  Consortium,
  ConsortiumMember,
  CactusNode,
  Ledger,
} from "@hyperledger/cactus-core-api";
import { DefaultApi as ApiConsortium } from "@hyperledger/cactus-plugin-consortium-manual";
import { DefaultConsortiumProvider } from "./default-consortium-provider";

import {
  Configuration,
  DefaultApi,
} from "./generated/openapi/typescript-axios";

/**
 * Class responsible for providing additional functionality to the `DefaultApi`
 * classes of the generated clients (OpenAPI generator / typescript-axios).
 *
 * Each package (plugin) can define it's own OpenAPI spec which means that they
 * all can ship with their own `DefaultApi` class that is generated directly
 * from the respective OpenAPI spec of the package/plugin.
 *
 * The functionality provided by this class is meant to be common traints that
 * can be useful for all of those different `DefaultApi` implementations.
 *
 * One such common trait is the client side component of the routing that
 * decides which Cactus node to point the `ApiClient` towards (which is in
 * itself ends up being the act of routing).
 *
 * @see https://github.com/OpenAPITools/openapi-generator/blob/v5.0.0-beta2/modules/openapi-generator/src/main/resources/typescript-axios/apiInner.mustache#L337
 * @see https://github.com/OpenAPITools/openapi-generator/blob/master/docs/generators/typescript-axios.md
 */
export class ApiClient extends DefaultApi {
  /**
   *
   * @param ctor
   */
  public extendWith<T extends {}>(
    ctor: new (configuration?: Configuration) => T
  ): T & this {
    const instance = new ctor(this.configuration) as any;
    const self = this as any;

    Objects.getAllMethodNames(instance).forEach(
      (method: string) => (self[method] = instance[method])
    );

    Objects.getAllFieldNames(instance).forEach(
      (field: string) => (self[field] = instance[field])
    );

    return this as T & this;
  }

  /**
   * Builds the default `Consortium` provider that can be used by this object
   * to retrieve the Cactus Consortium metadata object when necessary (one such
   * case is when we need information about the consortium nodes to perform
   * routing requests to a specific ledger via a connector plugin, but later
   * other uses could be added as well).
   *
   * The `DefaultConsortiumProvider` class leverages the simplest consortium
   * plugin that we have at the time of this writing:
   * `@hyperledger/cactus-plugin-consortium-manual` which holds the consortium
   * metadata as pre-configured by the consortium operators.
   *
   * The pattern we use in the `ApiClient` class is that you can inject your
   * own `IAsyncProvider<Consortium>` implementation which then will be used
   * for routing information and in theory you can implement completely arbitrary
   * consortium management in your own consortium plugins which then Cactus
   * can use and leverage for the routing.
   * This allows us to support any exotic consortium management algorithms
   * that people may come up with such as storing the consortium definiton in
   * a multi-sig smart contract or have the list of consortium nodes be powered
   * by some sort of automatic service discovery or anything else that people
   * might think of.
   *
   * @see {DefaultConsortiumProvider}
   */
  public get defaultConsortiumProvider(): IAsyncProvider<Consortium> {
    Checks.truthy(this.configuration, "ApiClient#configuration");
    const apiClient = new ApiConsortium(this.configuration);
    return new DefaultConsortiumProvider({ apiClient });
  }

  public async ofLedger<T>(
    ledgerOrId: string | Ledger,
    ctor: new (configuration?: Configuration) => T
  ): Promise<ApiClient & T>;
  /**
   * Constructs a new `ApiClient` object that is tied to whichever Cactus node
   * has a ledger connector plugin configured to talk to the distributed ledger
   * denoted by the `ledgerId` parameter of the method.
   *
   * This is part of how we do request routing between different nodes, some of
   * which may or may not run a ledger connector tied to a particular instance.
   * (E.g. this method ensures that the returned `ApiClient` instance is bound
   * to the network host of a Cactus node which does indeed have a connection
   * to the specified `ledgerId` parameter)
   *
   * @param ledgerOrId The ID of the ledger to obtain an API client object for
   * or the `Ledger` object which will be used to get the ledgerId from.
   * @param consortiumProvider The provider that can be used to retrieve the
   * consortium metadata at runtime for the purposes of looking up ledgers by
   * the provided `ledgerId` parameter.
   */
  public async ofLedger<T extends {}>(
    ledgerOrId: string | Ledger,
    ctor: new (configuration?: Configuration) => T,
    consortiumProvider: IAsyncProvider<Consortium> = this
      .defaultConsortiumProvider
  ): Promise<ApiClient & T> {
    const fnTags = "ApiClient#forLedgerId()";

    Checks.truthy(ledgerOrId, `${fnTags}:ledgerOrId`);
    Checks.truthy(consortiumProvider, `${fnTags}:consortiumProvider`);

    let ledgerId: string;
    if (typeof ledgerOrId === "string") {
      ledgerId = ledgerOrId;
    } else {
      ledgerId = ledgerOrId.id;
    }

    const consortium: Consortium = await consortiumProvider.get();
    Checks.truthy(consortiumProvider, `${fnTags}:consortium`);

    // Find a list of nodes in the consortium that have a connector plugin
    // running that's associated with the ledger based on ledger ID.
    const nodes = consortium.members
      .map((member: ConsortiumMember) =>
        member.nodes.filter((node: CactusNode) =>
          node.ledgers.some((ledger: Ledger) => ledger.id === ledgerId)
        )
      )
      .flat();

    // pick a random element from the array of nodes that have a connection to
    // the target ledger (based on the ledger ID)
    const randomNode = nodes[Math.floor(Math.random() * nodes.length)];

    const configuration = new Configuration({
      basePath: randomNode.nodeApiHost,
    });

    return new ApiClient(configuration).extendWith(ctor);
  }
}

// type UnionToIntersection<U> =
//   (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

// function extendWith<A extends any[]>(...args: A): UnionToIntersection<A[number]> { return null! }

// extendWith(new DefaultApi(), new ApiConsortium());

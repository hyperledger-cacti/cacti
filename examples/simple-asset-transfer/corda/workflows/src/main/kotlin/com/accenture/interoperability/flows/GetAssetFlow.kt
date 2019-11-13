package com.accenture.interoperability.flows

import co.paralleluniverse.fibers.Suspendable
import com.accenture.interoperability.states.AssetState
import net.corda.core.contracts.StateAndRef
import net.corda.core.flows.FlowLogic
import net.corda.core.flows.StartableByRPC
import net.corda.core.node.services.vault.DEFAULT_PAGE_NUM
import net.corda.core.node.services.vault.PageSpecification
import net.corda.core.node.services.vault.QueryCriteria
import net.corda.core.node.services.vault.Sort

/**
 * Flow return single Asset state by assetId or null.
 */
@StartableByRPC
class GetAssetFlow(
    private val assetId: String
) : FlowLogic<StateAndRef<AssetState>?>() {
    @Suspendable
    override fun call() = serviceHub.vaultService.queryBy(
        criteria = QueryCriteria.LinearStateQueryCriteria(
            externalId = listOf(assetId)
        ),
        sorting = Sort(emptyList()),
        paging = PageSpecification(DEFAULT_PAGE_NUM, 2),
        contractStateType = AssetState::class.java
    ).states.singleOrNull()
}
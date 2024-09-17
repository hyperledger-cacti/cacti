package org.hyperledger.cacti.plugin.copm

import org.hyperledger.cacti.plugin.copm.interfaces.InteropConfig
import org.hyperledger.cacti.plugin.copm.interfaces.CordaConfiguration
import org.hyperledger.cacti.plugin.copm.endpoints.*
import org.hyperledger.cacti.plugin.copm.validators.*
import io.grpc.Status
import net.corda.core.CordaRuntimeException
import net.corda.core.utilities.loggerFor
import com.google.protobuf.Empty
import net.devh.boot.grpc.server.advice.GrpcAdvice
import net.devh.boot.grpc.server.advice.GrpcExceptionHandler
import net.devh.boot.grpc.server.service.GrpcService
import org.hyperledger.cacti.plugin.copm.core.ClaimPledgedAssetV1200ResponsePb
import org.hyperledger.cacti.plugin.copm.core.GetVerifiedViewV1200ResponsePb
import org.hyperledger.cacti.plugin.copm.core.LockAssetV1200ResponsePb
import org.hyperledger.cacti.plugin.copm.core.PledgeAssetV1200ResponsePb
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceGrpcKt
import org.hyperledger.cacti.plugin.copm.core.services.defaultservice.DefaultServiceOuterClass
import org.springframework.beans.factory.annotation.Autowired


@GrpcService
class ApiCopmCordaServiceImpl : DefaultServiceGrpcKt.DefaultServiceCoroutineImplBase() {

    lateinit var transactionContextFactory: DLTransactionContextFactory
    lateinit var cordaConfig: CordaConfiguration
    lateinit var interopConfig: InteropConfig

    @Autowired
    fun setupCordaConfig(config: CordaConfiguration) {
        this.cordaConfig = config
    }

    @Autowired
    fun setupInteropConfig(config: InteropConfig) {
        this.interopConfig = config
    }

    @Autowired
    fun setupContextFactory(factory: DLTransactionContextFactory) {
        this.transactionContextFactory = factory
    }

    companion object {
        val logger = loggerFor<ApiCopmCordaServiceImpl>()
    }

    override suspend fun noopV1(request: Empty): Empty {
        return Empty.getDefaultInstance();
    }

    override suspend fun claimLockedAssetV1(request: DefaultServiceOuterClass.ClaimLockedAssetV1Request): ClaimPledgedAssetV1200ResponsePb.ClaimPledgedAssetV1200ResponsePB {
        return claimLockedAssetV1Impl(request, this.transactionContextFactory, this.cordaConfig)
    }

    override suspend fun claimPledgedAssetV1(request: DefaultServiceOuterClass.ClaimPledgedAssetV1Request): ClaimPledgedAssetV1200ResponsePb.ClaimPledgedAssetV1200ResponsePB {
        return claimPledgedAssetV1Impl(request, this.transactionContextFactory, this.cordaConfig, this.interopConfig)
    }

    override suspend fun getVerifiedViewV1(request: DefaultServiceOuterClass.GetVerifiedViewV1Request): GetVerifiedViewV1200ResponsePb.GetVerifiedViewV1200ResponsePB {
        return getVerifiedViewV1Impl(request, this.transactionContextFactory)
    }

    override suspend fun lockAssetV1(request: DefaultServiceOuterClass.LockAssetV1Request): LockAssetV1200ResponsePb.LockAssetV1200ResponsePB
    {
        return lockAssetV1Impl(request, this.transactionContextFactory, this.cordaConfig)
    }

    override suspend fun pledgeAssetV1(request: DefaultServiceOuterClass.PledgeAssetV1Request): PledgeAssetV1200ResponsePb.PledgeAssetV1200ResponsePB {
        // Obtain the recipient certificate from the name of the recipient
        return pledgeAssetV1Impl(request, this.transactionContextFactory, this.cordaConfig)
    }

}


@GrpcAdvice
class GlobalExceptionHandler {
    companion object {
        val logger = loggerFor<GlobalExceptionHandler>()
    }

    @GrpcExceptionHandler(IllegalArgumentException::class)
    fun handleMyCustomException(e: IllegalArgumentException): Status {
        logger.error(e.message)
        return Status.INVALID_ARGUMENT.withDescription(e.message)
    }

    @GrpcExceptionHandler(IllegalStateException::class)
    fun handleMyCustomException(e: IllegalStateException): Status {
        logger.error(e.message)
        return Status.INTERNAL.withDescription(e.message)
    }

    @GrpcExceptionHandler(CordaRuntimeException::class)
    fun handleMyCustomException(e: CordaRuntimeException): Status {
        logger.error(e.message)
        return Status.INTERNAL.withDescription(e.message)
    }
}

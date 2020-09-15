import {
    LiquidityPoolV2Converter,
    Activation as ActivationEvent,
    Conversion as ConversionEvent,
    ConversionFeeUpdate as ConversionFeeUpdateEvent,
    LiquidityAdded as LiquidityAddedEvent,
    LiquidityRemoved as LiquidityRemovedEvent,
    OwnerUpdate as OwnerUpdateEvent,
    TokenRateUpdate as TokenRateUpdateEvent
} from '../../generated/templates/LiquidityPoolV2Converter/LiquidityPoolV2Converter'
import {
    ERC20Token
} from '../../generated/templates/LiquidityPoolV2Converter/ERC20Token'
import {
    SmartToken
} from '../../generated/templates/LiquidityPoolV2Converter/SmartToken'
import {
    PriceOracle
} from '../../generated/templates/LiquidityPoolV2Converter/PriceOracle'
import {
    EACAggregatorProxy
} from '../../generated/templates/LiquidityPoolV2Converter/EACAggregatorProxy'
import { 
    Converter as ConverterEntity,
    ConverterBalance as ConverterBalanceEntity,
    LiquidityProviderBalance as LiquidityProviderBalanceEntity,
    PoolToken as PoolTokenEntity,
    Swap as SwapEntity,
    Token as TokenEntity,
    VolumeStat as VolumeStatEntity,
} from '../../generated/schema'
import { log, BigDecimal, BigInt, Address } from '@graphprotocol/graph-ts'
import { 
    ETH_ADDRESS, 
    createAndReturnConverter, 
    createAndReturnPlatformStat,
    createAndReturnUser,
    createAndReturnConverterVolumeStat
} from './helpers'

export function handleActivation(event: ActivationEvent): void {
    let converter = createAndReturnConverter(event.address);
    converter.activated = event.params._activated;
    converter.save();

    let platform = createAndReturnPlatformStat();
    platform.numActiveConverters = event.params._activated ? platform.numActiveConverters.plus(BigInt.fromI32(1)) : platform.numActiveConverters.minus(BigInt.fromI32(1))
    platform.save();
    // event.params._anchor
    // event.params._type

    _updateReserveBalancesAndWeights(event.address)
}

export function handleConversion(event: ConversionEvent): void {
    let id = event.transaction.hash.toHexString() + "-" + event.logIndex.toString();

    let converter = createAndReturnConverter(event.address);
    let user = createAndReturnUser(event.params._trader);
    let fromToken = createAndReturnToken(event.params._fromToken);
    let toToken = createAndReturnToken(event.params._toToken);

    let swap = SwapEntity.load(id);
    if (swap === null) {
        swap = new SwapEntity(id);
        swap.converter = converter.id;
        swap.fromToken = fromToken.id;
        swap.fromAmount = event.params._amount.divDecimal((BigInt.fromI32(10).pow(fromToken.decimals.toI32() as u8).toBigDecimal()));
        swap.toToken = toToken.id;
        swap.toAmount = event.params._return.divDecimal((BigInt.fromI32(10).pow(toToken.decimals.toI32() as u8).toBigDecimal()));
        swap.conversionFee = event.params._conversionFee.divDecimal((BigInt.fromI32(10).pow(toToken.decimals.toI32() as u8).toBigDecimal()));
        swap.trader = user.id;
        swap.txFrom = event.transaction.from.toHexString();
        swap.txTo = event.transaction.to.toHexString();
        swap.createdAtBlockNumber = event.block.number;
        swap.createdAtLogIndex = event.logIndex;
        swap.createdAtTimestamp = event.block.timestamp;
        swap.createdAtTransaction = event.transaction.hash.toHexString();

        if (swap.fromAmount.equals(BigDecimal.fromString("0.0"))) {
            swap.price = BigDecimal.fromString("0.0");
        }
        else {
            swap.price = swap.fromAmount.div(swap.toAmount);
        }

        swap.save()

        let platform = createAndReturnPlatformStat();
        platform.swaps = platform.swaps.plus(BigInt.fromI32(1));
        platform.save()

        converter.numSwaps = converter.numSwaps.plus(BigInt.fromI32(1));
        converter.save()
    }

    // From token volume
    let volumeStat = createAndReturnConverterVolumeStat(event.address, event.params._fromToken);
    volumeStat.sellVolume = volumeStat.sellVolume.plus(
        event.params._amount.divDecimal((BigInt.fromI32(10).pow(fromToken.decimals.toI32() as u8).toBigDecimal()))
    );
    volumeStat.totalVolume = volumeStat.totalVolume.plus(
        event.params._amount.divDecimal((BigInt.fromI32(10).pow(fromToken.decimals.toI32() as u8).toBigDecimal()))
    );
    volumeStat.save();

    // volumeStat = _createAndReturnTokenVolumeStat(event.params._fromToken);
    // volumeStat.sellVolume = volumeStat.sellVolume.plus(
    //     event.params._amount.divDecimal((BigInt.fromI32(10).pow(fromToken.decimals.toI32() as u8).toBigDecimal()))
    // );
    // volumeStat.totalVolume = volumeStat.totalVolume.plus(
    //     event.params._amount.divDecimal((BigInt.fromI32(10).pow(fromToken.decimals.toI32() as u8).toBigDecimal()))
    // );
    // volumeStat.save();

    // To token volume
    volumeStat = createAndReturnConverterVolumeStat(event.address, event.params._toToken);
    volumeStat.buyVolume = volumeStat.buyVolume.plus(
        event.params._return.divDecimal((BigInt.fromI32(10).pow(toToken.decimals.toI32() as u8).toBigDecimal()))
    );
    volumeStat.totalVolume = volumeStat.totalVolume.plus(
        event.params._return.divDecimal((BigInt.fromI32(10).pow(toToken.decimals.toI32() as u8).toBigDecimal()))
    );
    volumeStat.save();

    // volumeStat = _createAndReturnTokenVolumeStat(event.params._toToken);
    // volumeStat.buyVolume = volumeStat.buyVolume.plus(
    //     event.params._amount.divDecimal((BigInt.fromI32(10).pow(toToken.decimals.toI32() as u8).toBigDecimal()))
    // );
    // volumeStat.totalVolume = volumeStat.totalVolume.plus(
    //     event.params._amount.divDecimal((BigInt.fromI32(10).pow(toToken.decimals.toI32() as u8).toBigDecimal()))
    // );
    // volumeStat.save();

    // Update token balances
    _updateReserveBalancesAndWeights(event.address);
}

export function handleConversionFeeUpdate(event: ConversionFeeUpdateEvent): void {
    let converter = createAndReturnConverter(event.address);
    converter.conversionFee = event.params._newFee.divDecimal(BigDecimal.fromString("1000000")); // Conversion fee is given in ppm
    converter.save()
}

export function handleLiquidityAdded(event: LiquidityAddedEvent): void {
    let user = createAndReturnUser(event.params._provider);
    let token = createAndReturnToken(event.params._reserveToken);
    let converter = createAndReturnConverter(event.address);
    let converterBalance = _createAndReturnConverterBalance(event.address, event.params._reserveToken);

    // Update pool token supply
    let poolTokenAddress = Address.fromHexString(converterBalance.poolToken) as Address;
    let poolToken = _createAndReturnPoolToken(event.address, poolTokenAddress, event.params._reserveToken);
    let poolTokensDelta = event.params._newSupply.divDecimal((BigInt.fromI32(10).pow(poolToken.decimals.toI32() as u8).toBigDecimal())).minus(poolToken.supply);
    poolToken.supply = event.params._newSupply.divDecimal((BigInt.fromI32(10).pow(poolToken.decimals.toI32() as u8).toBigDecimal()));
    poolToken.save()

    // Update LP balance
    let lpb = _createAndReturnLiquidityProviderBalance(event.params._provider, poolTokenAddress);
    // TODO: Check lpb balances
    lpb.poolTokenAmount = lpb.poolTokenAmount.plus(poolTokensDelta);
    lpb.save();

    // Update token balances & pool token share value
    _updateReserveBalancesAndWeights(event.address);
}

export function handleLiquidityRemoved(event: LiquidityRemovedEvent): void {
    let user = createAndReturnUser(event.params._provider);
    let token = createAndReturnToken(event.params._reserveToken);
    let converter = createAndReturnConverter(event.address);
    let converterBalance = _createAndReturnConverterBalance(event.address, event.params._reserveToken);


    // Update pool token supply
    let poolTokenAddress = Address.fromHexString(converterBalance.poolToken) as Address;
    let poolToken = _createAndReturnPoolToken(event.address, poolTokenAddress, event.params._reserveToken);
    let poolTokensDelta = event.params._newSupply.divDecimal((BigInt.fromI32(10).pow(poolToken.decimals.toI32() as u8).toBigDecimal())).minus(poolToken.supply);
    poolToken.supply = event.params._newSupply.divDecimal((BigInt.fromI32(10).pow(poolToken.decimals.toI32() as u8).toBigDecimal()));
    poolToken.save()

    // Update LP balance
    let lpb = _createAndReturnLiquidityProviderBalance(event.params._provider, poolTokenAddress);
    lpb.poolTokenAmount = lpb.poolTokenAmount.plus(poolTokensDelta);
    if (lpb.poolTokenAmount.lt(BigDecimal.fromString("0.0"))) {
        log.warning("LPB NEGATIVE {}", [lpb.id])
        // TODO: Check for warnings
    }
    lpb.save();

    // Update token balances
    _updateReserveBalancesAndWeights(event.address);
}

export function handleOwnerUpdate(event: OwnerUpdateEvent): void {
    let id = event.address.toHexString();
    let debug_id = event.transaction.hash.toHexString();
    let newOwner = event.params._newOwner.toHexString();
    let prevOwner = event.params._prevOwner.toHexString();
    log.debug("handleOwnerUpdate {} tx: {} new: {} old: {}", [
        id, debug_id, newOwner, prevOwner
    ])
}

export function handleTokenRateUpdate(event: TokenRateUpdateEvent): void {
    log.debug("handleTokenRateUpdate {} {} {} {}", [
        event.params._token1.toHexString(),
        event.params._rateN.toString(),
        event.params._token2.toHexString(),
        event.params._rateD.toString()
    ])
}

function _createAndReturnLiquidityProviderBalance(lp: Address, poolToken: Address): LiquidityProviderBalanceEntity {
    let id = lp.toHexString() + "-" + poolToken.toHexString();
    let lpb = LiquidityProviderBalanceEntity.load(id);
    if (lpb === null) {
        let poolTokenEntity = PoolTokenEntity.load(poolToken.toHexString());
        if (poolTokenEntity === null) {
            log.error("PoolToken not found {}", [poolToken.toHexString()])
        }

        lpb = new LiquidityProviderBalanceEntity(id);
        lpb.provider = lp.toHexString();
        lpb.poolToken = poolTokenEntity.id;
        lpb.poolTokenAmount = BigDecimal.fromString("0.0");
        // lpb.underlyingToken = poolTokenEntity.underlyingToken;
        // lpb.underlyingAmount = BigInt.fromI32(0);
        lpb.save()
    }
    return lpb!
}

function _createAndReturnPoolToken(converterAddress: Address, poolTokenAddress: Address, underlyingTokenAddress: Address): PoolTokenEntity {
    let id = poolTokenAddress.toHexString()
    let poolToken = PoolTokenEntity.load(id);
    if (poolToken === null) {
        let tokenContract = SmartToken.bind(poolTokenAddress);
        let nameResult = tokenContract.try_name();
        let symbolResult = tokenContract.try_symbol();
        let decimalsResult = tokenContract.try_decimals();
        let underlyingTokenEntity = createAndReturnToken(underlyingTokenAddress);

        poolToken = new PoolTokenEntity(id);
        poolToken.converter = converterAddress.toHexString();
        poolToken.name = nameResult.reverted ? "" : nameResult.value
        poolToken.symbol = symbolResult.reverted ? "" : symbolResult.value
        poolToken.decimals = decimalsResult.reverted ? BigInt.fromI32(0) : BigInt.fromI32(decimalsResult.value)
        poolToken.underlyingToken = underlyingTokenEntity.id
        poolToken.supply = BigDecimal.fromString("0.0");
        poolToken.shareValue = BigDecimal.fromString("0.0");
        poolToken.shareValueEth = BigDecimal.fromString("0.0");
        poolToken.save();
    }
    else {
        poolToken.converter = converterAddress.toHexString();
        poolToken.save();
    }
    return poolToken!
}

function _createAndReturnConverterBalance(converterAddress: Address, tokenAddress: Address): ConverterBalanceEntity {
    let id = converterAddress.toHexString() + "-" + tokenAddress.toHexString();
    let converterBalance = ConverterBalanceEntity.load(id);
    if (converterBalance === null) {
        // Get poolToken
        let converterContract = LiquidityPoolV2Converter.bind(converterAddress);
        let poolTokenResult = converterContract.try_poolToken(tokenAddress);
        if (poolTokenResult.reverted) {
            log.error("_createAndReturnConverterBalance contract call reverted {}", [id])
        }
        let poolToken = _createAndReturnPoolToken(converterAddress, poolTokenResult.value, tokenAddress);

        // Create converter balance
        converterBalance = new ConverterBalanceEntity(id);
        converterBalance.converter = converterAddress.toHexString();
        converterBalance.poolToken = poolToken.id;
        converterBalance.token = tokenAddress.toHexString();
        converterBalance.stakedAmount = BigDecimal.fromString("0.0");
        converterBalance.balance = BigDecimal.fromString("0.0");
        converterBalance.weight = BigDecimal.fromString("0.0");
        converterBalance.save();
    }
    return converterBalance!
}

function _createAndReturnTokenVolumeStat(tokenAddress: Address): VolumeStatEntity {
    let token = tokenAddress.toHexString();
    let id = "Bancor-" + token;

    let platform = createAndReturnPlatformStat();

    let volumeStat = VolumeStatEntity.load(id);
    if (volumeStat === null) {
        volumeStat = new VolumeStatEntity(id);
        volumeStat.token = token;
        volumeStat.buyVolume = BigDecimal.fromString("0.0");
        volumeStat.sellVolume = BigDecimal.fromString("0.0");
        volumeStat.totalVolume = BigDecimal.fromString("0.0");
        volumeStat.platform = platform.id;
        volumeStat.save();
    }
    return volumeStat!
}

function _updateReserveBalancesAndWeights(converterAddress: Address): void {
    let id = converterAddress.toHexString();
    let converterContract = LiquidityPoolV2Converter.bind(converterAddress);

    let converter = ConverterEntity.load(id);
    if (converter === null) {
        log.warning("_updateReserveBalancesAndWeights Converter not found {}", [id])
        return
    }

    // Update price oracle
    let priceOracleResult = converterContract.try_priceOracle();
    converter.priceOracle = priceOracleResult.reverted ? null : priceOracleResult.value.toHexString();
    converter.save()

    // Update balances and weights
    let i = BigInt.fromI32(0);
    let isReverted = false;
    while (!isReverted) {
        let reserveTokenResult = converterContract.try_reserveTokens(i);
        if (reserveTokenResult.reverted) {
            isReverted = true;
            continue
        }

        let reserveBalanceResult = converterContract.try_reserveStakedBalance(reserveTokenResult.value);
        let reserveWeightResult = converterContract.try_reserveWeight(reserveTokenResult.value);
        
        if (reserveBalanceResult.reverted || reserveWeightResult.reverted) {
            log.error("_updateReserveBalancesAndWeights contract calls reverted for converter {} and token {}", [
                id,
                reserveTokenResult.value.toHexString()
            ]);
            continue
        }

        let reserveToken = createAndReturnToken(reserveTokenResult.value);
        let converterBalance = _createAndReturnConverterBalance(converterAddress, reserveTokenResult.value);

        // Update converter actual balance
        let reserveTokenContract = ERC20Token.bind(reserveTokenResult.value);

        let balanceOf = reserveTokenContract.try_balanceOf(converterAddress);
        if (!balanceOf.reverted) {
            converterBalance.balance = balanceOf.value.divDecimal((BigInt.fromI32(10).pow(reserveToken.decimals.toI32() as u8).toBigDecimal()));
        }
        else {
            log.warning("Balance of reverted for {} {}", [
                converterAddress.toHexString(),
                reserveTokenResult.value.toHexString()
            ])
        }

        // Update converter staked reserve balance
        converterBalance.stakedAmount = reserveBalanceResult.value.divDecimal((BigInt.fromI32(10).pow(reserveToken.decimals.toI32() as u8).toBigDecimal()));
        converterBalance.weight = reserveWeightResult.value.divDecimal(BigDecimal.fromString("1000000")); // Weight is given in ppm
        converterBalance.save()

        // Calculate shareValue
        let poolToken = _createAndReturnPoolToken(converterAddress, Address.fromHexString(converterBalance.poolToken) as Address, reserveTokenResult.value);
        let poolTokenSupply = poolToken.supply;
        let shareValue = BigDecimal.fromString("0.0");

        if (poolTokenSupply.gt(BigDecimal.fromString("0.0"))) {
            shareValue = converterBalance.stakedAmount.div(poolTokenSupply);
        }
        
        poolToken.shareValue = shareValue;

        if (converter.priceOracle == null) {
            log.warning("Price oracle not found for converter {}", [converter.id])
        }
        else {
            let priceOracleContract = PriceOracle.bind(Address.fromHexString(converter.priceOracle) as Address);
            let oracleAddress = priceOracleContract.tokensToOracles(reserveTokenResult.value);
            let oracleContract = EACAggregatorProxy.bind(oracleAddress);
            let rate = oracleContract.latestAnswer();
            let decimals = oracleContract.decimals();
    
            poolToken.shareValueEth = shareValue.times(rate.divDecimal((BigInt.fromI32(10).pow(decimals as u8).toBigDecimal())))
    
        }

        poolToken.save()
        i = i.plus(BigInt.fromI32(1));
    }
}

function createAndReturnToken(tokenAddress: Address): TokenEntity {
    let id = tokenAddress.toHexString();
    let token = TokenEntity.load(id);
    if (token === null) {
        if (id != ETH_ADDRESS) {
            let tokenContract = ERC20Token.bind(tokenAddress);
            let nameResult = tokenContract.try_name();
            let symbolResult = tokenContract.try_symbol();
            let decimalsResult = tokenContract.try_decimals();

            token = new TokenEntity(id);
            token.name = nameResult.reverted ? "" : nameResult.value
            token.symbol = symbolResult.reverted ? "" : symbolResult.value
            token.decimals = decimalsResult.reverted ? BigInt.fromI32(0) : BigInt.fromI32(decimalsResult.value)
            token.save()
        } 
        else {
            token = new TokenEntity(id);
            token.name = "ether"
            token.symbol = "ETH"
            token.decimals = BigInt.fromI32(18)
            token.save()
        }
    }
    return token!
}
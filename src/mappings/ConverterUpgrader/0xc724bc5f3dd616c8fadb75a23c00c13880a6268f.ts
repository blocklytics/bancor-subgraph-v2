// Testing if I can create converters from the ConverterUpgrader
// The idea is that Converters via Factories will already be created
// IF THIS PICKS UP MORE CONVERTERS, DO FOR THE REST
import { 
    Converter as ConverterEntity,
    ConverterBalance as ConverterBalanceEntity,
    PoolToken as PoolTokenEntity,
    Token as TokenEntity,
} from '../../../generated/schema'
import {
    LiquidityPoolV2Converter as LiquidityPoolV2ConverterContract
} from '../../../generated/ConverterUpgrader-0xc724bc5f3dd616c8fadb75a23c00c13880a6268f/LiquidityPoolV2Converter'
import {
    LiquidityPoolV1Converter as LiquidityPoolV1ConverterContract
} from '../../../generated/ConverterUpgrader-0xc724bc5f3dd616c8fadb75a23c00c13880a6268f/LiquidityPoolV1Converter'
import {
    Converter27 as Converter27Contract
} from '../../../generated/ConverterUpgrader-0xc724bc5f3dd616c8fadb75a23c00c13880a6268f/Converter27'
import {
    Converter25 as Converter25Contract
} from '../../../generated/ConverterUpgrader-0xc724bc5f3dd616c8fadb75a23c00c13880a6268f/Converter25'
import {
    ERC20Token
} from '../../../generated/ConverterUpgrader-0xc724bc5f3dd616c8fadb75a23c00c13880a6268f/ERC20Token'
import {
    LiquidityPoolV2Converter as LiquidityPoolV2ConverterTemplate,
    LiquidityPoolV1Converter as LiquidityPoolV1ConverterTemplate,
    Converter27 as Converter27Template,
    Converter25 as Converter25Template,
} from '../../../generated/templates'
import {
    ConverterUpgrader,
    ConverterOwned as ConverterOwnedEvent,
    ConverterUpgrade as ConverterUpgradeEvent,
    OwnerUpdate as OwnerUpdateEvent
} from '../../../generated/ConverterUpgrader-0xc724bc5f3dd616c8fadb75a23c00c13880a6268f/ConverterUpgrader'
import { log, BigDecimal, BigInt, Address } from '@graphprotocol/graph-ts'

export function handleConverterOwned(event: ConverterOwnedEvent): void {}

/**
 * In the event of an upgrade, the old converter moves to the new one.
 */
export function handleConverterUpgrade(event: ConverterUpgradeEvent): void {
    let newConverterAddress = event.params._newConverter;
    let oldConverterAddress = event.params._oldConverter;
    
    log.debug("Checkpoint 1 for Upgrader {}: {} to {}", [
        event.address.toHexString(), oldConverterAddress.toHexString(), newConverterAddress.toHexString(), 
    ])

    let newConverter = ConverterEntity.load(oldConverterAddress.toHexString());
    if (newConverter === null) {
        log.debug("Checkpoint 2 for Upgrader {}: {} to {}", [
            event.address.toHexString(), oldConverterAddress.toHexString(), newConverterAddress.toHexString(), 
        ])
        _createNewConverter(newConverterAddress, event);
        newConverter = ConverterEntity.load(newConverterAddress.toHexString());
    }

    if (newConverter === null) {
        log.debug("Checkpoint 3 for Upgrader {}: {} to {}", [
            event.address.toHexString(), oldConverterAddress.toHexString(), newConverterAddress.toHexString(), 
        ])
        log.debug("ConverterEntity null: {}", [newConverterAddress.toHexString()])
    }

    log.debug("Checkpoint 4 for Upgrader {}: {} to {}", [
        event.address.toHexString(), oldConverterAddress.toHexString(), newConverterAddress.toHexString(), 
    ])

    let oldConverter = ConverterEntity.load(oldConverterAddress.toHexString());
    if (oldConverter === null) {
        log.debug("Checkpoint 5 for Upgrader {}: {} to {}", [
            event.address.toHexString(), oldConverterAddress.toHexString(), newConverterAddress.toHexString(), 
        ])
        _createNewConverter(oldConverterAddress, event);
        oldConverter = ConverterEntity.load(oldConverterAddress.toHexString());
    }
    if (oldConverter === null) {
        log.debug("Checkpoint 6 for Upgrader {}: {} to {}", [
            event.address.toHexString(), oldConverterAddress.toHexString(), newConverterAddress.toHexString(), 
        ])
        log.debug("ConverterEntity null: {}", [newConverterAddress.toHexString()])
    }

    if (newConverter === null || oldConverter === null) {
        log.warning("handleConverterUpgrade: Conversion not handled from {} {} to {} {}", [
            oldConverterAddress.toHexString(),
            oldConverter === null ? "(Not found)" : "",
            newConverterAddress.toHexString(),
            newConverter === null ? "(Not found)" : ""
        ])
        return
    }

    log.debug("Checkpoint 7 for Upgrader {}: {} to {}", [
        event.address.toHexString(), oldConverterAddress.toHexString(), newConverterAddress.toHexString(), 
    ])
    
    // newConverter.upgradedFrom = oldConverter.id;
    // newConverter.save()

    // oldConverter.upgradedTo = newConverter.id;
    // oldConverter.save()

    log.debug("Checkpoint 8 for Upgrader {}: {} to {}", [
        event.address.toHexString(), oldConverterAddress.toHexString(), newConverterAddress.toHexString(), 
    ])

    if (oldConverter.type.gt(BigInt.fromI32(0))) {
        _updateReserveBalancesAndWeights(oldConverterAddress);
    }
    else {
        log.warning("Did not updated balances for {}", [oldConverter.id])
    }
}

export function handleOwnerUpdate(event: OwnerUpdateEvent): void {}

function _createAndReturnConverterBalance(converterAddress: Address, tokenAddress: Address): ConverterBalanceEntity {
    let id = converterAddress.toHexString() + "-" + tokenAddress.toHexString();
    let converterBalance = ConverterBalanceEntity.load(id);
    let poolTokenAddress: Address | null;
    if (converterBalance === null) {
        // Get poolToken
        let converter = ConverterEntity.load(id);
        if (converter.type.equals(BigInt.fromI32(2))) {
            let converterContract = LiquidityPoolV2ConverterContract.bind(converterAddress);
            let poolTokenResult = converterContract.try_poolToken(tokenAddress);
            if (poolTokenResult.reverted) {
                log.error("_createAndReturnConverterBalance contract call reverted {}", [id])
            }
            poolTokenAddress = poolTokenResult.value;
        }

        // Create converter balance
        converterBalance = new ConverterBalanceEntity(id);
        converterBalance.converter = converterAddress.toHexString();
        converterBalance.poolToken = poolTokenAddress ? poolTokenAddress.toHexString() : null;
        converterBalance.token = tokenAddress.toHexString();
        converterBalance.stakedAmount = BigDecimal.fromString("0.0");
        converterBalance.balance = BigDecimal.fromString("0.0");
        converterBalance.weight = BigDecimal.fromString("0.0");
        converterBalance.save();
    }
    return converterBalance!
}

function _updateReserveBalancesAndWeights(converterAddress: Address): void {
    let id = converterAddress.toHexString();
    let converter = ConverterEntity.load(id);
    if (converter === null) {
        log.warning("_updateReserveBalancesAndWeights Converter not found {}", [id])
        return
    }

    let converterContract = LiquidityPoolV2ConverterContract.bind(converterAddress);

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

        let reserveToken = TokenEntity.load(reserveTokenResult.value.toHexString());
        if (reserveToken === null) {
            log.error("_updateReserveBalancesAndWeights token not found for converter {} and token {}", [
                id,
                reserveTokenResult.value.toHexString()
            ]);
            continue
        }

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

        // Update converter balance
        converterBalance.stakedAmount = reserveBalanceResult.value.divDecimal((BigInt.fromI32(10).pow(reserveToken.decimals.toI32() as u8).toBigDecimal()));
        converterBalance.weight = reserveWeightResult.value.divDecimal(BigDecimal.fromString("1000000")); // Weight is given in ppm
        converterBalance.save();

        // Calculate shareValue
        let poolTokenAddress = Address.fromHexString(converterBalance.poolToken) as Address;
        let poolToken = PoolTokenEntity.load(poolTokenAddress.toHexString())
        let shareValue = BigDecimal.fromString("0.0");

        if (poolToken !== null) {
            let poolTokenSupply = poolToken.supply;
            if (poolTokenSupply.gt(BigDecimal.fromString("0.0"))) {
                shareValue = converterBalance.stakedAmount.div(poolTokenSupply);
            }
            poolToken.shareValue = shareValue;
            // todo pooltoken.shareValueEth
            poolToken.save();
        }

        i = i.plus(BigInt.fromI32(1));
    }
}

function _createNewConverter(converterAddress: Address, event: ConverterUpgradeEvent): void {
    let id = converterAddress.toHexString();
    let converter = ConverterEntity.load(id);
    if (converter != null) {
        log.warning("Converter already exists {}", [id])
        return
    }
    log.debug("Creating new converter {}", [id])

    let converterContract = LiquidityPoolV1ConverterContract.bind(converterAddress);
    let versionResult = converterContract.try_version();
    if (versionResult.reverted || versionResult.value as string == "Bancor") {
        log.error("version() reverted. Converter: {}", [
            id
        ])
        return
    }

    log.debug("Creating new converter {} (v{})", [id, versionResult.value as string])

    let converterType = BigInt.fromI32(0);
    let version = BigInt.fromI32(versionResult.value);
    if (version.lt(BigInt.fromI32(28))) {
        if (version.equals(BigInt.fromI32(24)) || version.equals(BigInt.fromI32(25))) {
            _createAndReturnConverter25(converterAddress, event);
            Converter25Template.create(converterAddress);
        }
        else if (version.equals(BigInt.fromI32(26)) || version.equals(BigInt.fromI32(27))) {
            _createAndReturnConverter27(converterAddress, event);
            Converter27Template.create(converterAddress);
        }
        else {
            log.error("Converter {} not a known type: {} (v{}).", [
                id, converterType.toString(), version.toString()
            ])
        }
    }
    else {
        let converterTypeResult = converterContract.try_converterType();
        if (converterTypeResult.reverted) {
            log.warning("Could not discover type! Converter: {} (v{})", [
                id,
                version.toString()
            ])
            return
        }
        converterType = BigInt.fromI32(converterTypeResult.value);
        if (converterType.equals(BigInt.fromI32(2))) {
            _createAndReturnLiquidityPoolV2Converter(converterAddress, event);
            LiquidityPoolV2ConverterTemplate.create(converterAddress);
        }
        else if (converterType.equals(BigInt.fromI32(1))) {
            _createAndReturnLiquidityPoolV1Converter(converterAddress, event);
            LiquidityPoolV1ConverterTemplate.create(converterAddress);
        }
    }
}

function _createAndReturnLiquidityPoolV2Converter(converterAddress: Address, event: ConverterUpgradeEvent): ConverterEntity {
    let id = converterAddress.toHexString();
    let converter = ConverterEntity.load(id);

    let converterContract = LiquidityPoolV2ConverterContract.bind(converterAddress);
    let anchorResult = converterContract.try_anchor();
    let conversionFeeResult = converterContract.try_conversionFee();
    let isActiveResult = converterContract.try_isActive();
    let versionResult = converterContract.try_version();
    let priceOracleResult = converterContract.try_priceOracle();
    let converterTypeResult = converterContract.try_converterType();
    
    if (anchorResult.reverted || conversionFeeResult.reverted || isActiveResult.reverted || versionResult.reverted || priceOracleResult.reverted || converterTypeResult.reverted) {
        log.warning("handleNewConverter {} missing details (type {}, version {})", [
            id, 
            converterTypeResult.value as string,
            versionResult.value as string
        ])
    }

    converter = new ConverterEntity(id);
    converter.activated = isActiveResult.value;
    converter.anchor = anchorResult.value.toHexString();
    converter.conversionFee = conversionFeeResult.value.divDecimal(BigDecimal.fromString("1000000")); // Conversion fee is given in ppm
    converter.factory = event.address.toHexString();
    converter.platform = "Bancor";
    converter.priceOracle = priceOracleResult.value.toHexString();
    converter.type = BigInt.fromI32(converterTypeResult.value);
    converter.version = BigInt.fromI32(versionResult.value);
    converter.numSwaps = BigInt.fromI32(0);
    converter.createdAtTimestamp = event.block.timestamp;
    converter.createdAtBlockNumber = event.block.number;
    converter.createdAtLogIndex = event.logIndex;
    converter.createdAtTransaction = event.transaction.hash.toHexString();
    converter.save();

    return converter!
}

function _createAndReturnLiquidityPoolV1Converter(converterAddress: Address, event: ConverterUpgradeEvent): ConverterEntity {
    let id = converterAddress.toHexString();
    let converter = ConverterEntity.load(id);

    let converterContract = LiquidityPoolV1ConverterContract.bind(converterAddress);
    let anchorResult = converterContract.try_anchor();
    let conversionFeeResult = converterContract.try_conversionFee();
    let isActiveResult = converterContract.try_isActive();
    let versionResult = converterContract.try_version();
    let converterTypeResult = converterContract.try_converterType();
    
    if (anchorResult.reverted || conversionFeeResult.reverted || isActiveResult.reverted || versionResult.reverted || converterTypeResult.reverted) {
        log.warning("handleNewConverter {} missing details (type {}, version {})", [
            id, 
            converterTypeResult.value as string,
            versionResult.value as string
        ])
    }

    converter = new ConverterEntity(id);
    converter.activated = isActiveResult.value;
    converter.anchor = anchorResult.value.toHexString();
    converter.conversionFee = conversionFeeResult.value.divDecimal(BigDecimal.fromString("1000000")); // Conversion fee is given in ppm
    converter.factory = event.address.toHexString();
    converter.platform = "Bancor";
    converter.type = BigInt.fromI32(converterTypeResult.value);
    converter.version = BigInt.fromI32(versionResult.value);
    converter.numSwaps = BigInt.fromI32(0);
    converter.createdAtTimestamp = event.block.timestamp;
    converter.createdAtBlockNumber = event.block.number;
    converter.createdAtLogIndex = event.logIndex;
    converter.createdAtTransaction = event.transaction.hash.toHexString();
    converter.save();

    return converter!
}

function _createAndReturnConverter27(converterAddress: Address, event: ConverterUpgradeEvent): ConverterEntity {
    let id = converterAddress.toHexString();
    log.debug("_createAndReturnConverter27 {}", [id])
    let converter = ConverterEntity.load(id);

    let converterContract = Converter27Contract.bind(converterAddress);
    let anchorResult = converterContract.try_token();
    let conversionFeeResult = converterContract.try_conversionFee();
    let versionResult = converterContract.try_version();
    let converterType = BigInt.fromI32(0);
    
    if (anchorResult.reverted || conversionFeeResult.reverted || versionResult.reverted) {
        log.warning("handleNewConverter {} missing details (type {}, version {})", [
            id, 
            converterType.toString(),
            versionResult.value as string
        ])
    }

    converter = new ConverterEntity(id);
    converter.activated = true;
    converter.anchor = anchorResult.value.toHexString();
    converter.conversionFee = conversionFeeResult.value.divDecimal(BigDecimal.fromString("1000000")); // Conversion fee is given in ppm
    converter.factory = event.address.toHexString();
    converter.platform = "Bancor";
    converter.type = converterType;
    converter.version = BigInt.fromI32(versionResult.value);
    converter.numSwaps = BigInt.fromI32(0);
    converter.createdAtTimestamp = event.block.timestamp;
    converter.createdAtBlockNumber = event.block.number;
    converter.createdAtLogIndex = event.logIndex;
    converter.createdAtTransaction = event.transaction.hash.toHexString();
    converter.save();

    return converter!
}

function _createAndReturnConverter25(converterAddress: Address, event: ConverterUpgradeEvent): ConverterEntity {
    let id = converterAddress.toHexString();
    log.debug("_createAndReturnConverter25 {}", [id])
    let converter = ConverterEntity.load(id);

    let converterContract = Converter25Contract.bind(converterAddress);
    let anchorResult = converterContract.try_token();
    let conversionFeeResult = converterContract.try_conversionFee();
    let versionResult = converterContract.try_version();
    let converterType = BigInt.fromI32(0);
    
    if (anchorResult.reverted || conversionFeeResult.reverted || versionResult.reverted) {
        log.warning("handleNewConverter {} missing details (type {}, version {})", [
            id, 
            converterType.toString(),
            versionResult.value as string
        ])
    }

    converter = new ConverterEntity(id);
    converter.activated = true;
    converter.anchor = anchorResult.value.toHexString();
    converter.conversionFee = conversionFeeResult.value.divDecimal(BigDecimal.fromString("1000000")); // Conversion fee is given in ppm
    converter.factory = event.address.toHexString();
    converter.platform = "Bancor";
    converter.type = converterType;
    converter.version = BigInt.fromI32(versionResult.value);
    converter.numSwaps = BigInt.fromI32(0);
    converter.createdAtTimestamp = event.block.timestamp;
    converter.createdAtBlockNumber = event.block.number;
    converter.createdAtLogIndex = event.logIndex;
    converter.createdAtTransaction = event.transaction.hash.toHexString();
    converter.save();

    return converter!
}
import { 
    NewConverter as NewConverterEvent
} from '../../../generated/ConverterFactory1-0x3cc4a258aff14a88380ca3d9703d6bbfb7a8042e/ConverterFactory'
import {
    LiquidityPoolV2Converter as LiquidityPoolV2ConverterContract
} from '../../../generated/ConverterFactory1-0x3cc4a258aff14a88380ca3d9703d6bbfb7a8042e/LiquidityPoolV2Converter'
import {
    LiquidityPoolV1Converter as LiquidityPoolV1ConverterContract
} from '../../../generated/ConverterFactory1-0x3cc4a258aff14a88380ca3d9703d6bbfb7a8042e/LiquidityPoolV1Converter'
import {
    Converter27 as Converter27Contract
} from '../../../generated/ConverterFactory1-0x3cc4a258aff14a88380ca3d9703d6bbfb7a8042e/Converter27'
import {
    Converter25 as Converter25Contract
} from '../../../generated/ConverterFactory1-0x3cc4a258aff14a88380ca3d9703d6bbfb7a8042e/Converter25'
import {
    LiquidityPoolV2Converter as LiquidityPoolV2ConverterTemplate,
    LiquidityPoolV1Converter as LiquidityPoolV1ConverterTemplate,
    Converter27 as Converter27Template,
    Converter25 as Converter25Template,
} from '../../../generated/templates'
import { 
    Converter as ConverterEntity 
} from '../../../generated/schema'
import { createAndReturnPlatformStat } from '../helpers'
import { log, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export function handleNewConverter(event: NewConverterEvent): void {
    let id = event.params._converter.toHexString();
    let converter = ConverterEntity.load(id);
    if (converter != null) {
        log.warning("Converter already exists {}", [id])
    }

    let converterContract = LiquidityPoolV1ConverterContract.bind(event.params._converter);
    let versionResult = converterContract.try_version();
    if (versionResult.reverted) {
        log.error("version() reverted. Factory: {} Converter: {}", [
            event.address.toHexString(),
            id
        ])
        return
    }

    let converterType = BigInt.fromI32(0);
    let version = BigInt.fromI32(versionResult.value);
    if (version.lt(BigInt.fromI32(28))) {
        if (version.equals(BigInt.fromI32(24)) || version.equals(BigInt.fromI32(25))) {
            _createAndReturnConverter25(event);
            Converter25Template.create(event.params._converter);
        }
        else if (version.equals(BigInt.fromI32(26)) || version.equals(BigInt.fromI32(27))) {
            _createAndReturnConverter27(event);
            Converter27Template.create(event.params._converter);
        }
        else {
            log.error("Converter {} not a known type: {} (v{}) from factory {}.", [
                id, converterType.toString(), version.toString(), event.address.toHexString()
            ])
            // LiquidityPoolV1ConverterTemplate.create(event.params._converter)
            // return
        }
    }
    else {
        log.debug("version >= 28. Factory: {} Converter: {}", [
            event.address.toHexString(),
            id
        ])
        let converterTypeResult = converterContract.try_converterType();
        if (converterTypeResult.reverted) {
            log.warning("Could not discover type! Factory: {} Converter: {} (v{})", [
                event.address.toHexString(),
                id,
                version.toString()
            ])
            return
        }
        converterType = BigInt.fromI32(converterTypeResult.value);
        if (converterType.equals(BigInt.fromI32(2))) {
            _createAndReturnLiquidityPoolV2Converter(event);
            LiquidityPoolV2ConverterTemplate.create(event.params._converter);
        }
        else if (converterType.equals(BigInt.fromI32(1))) {
            _createAndReturnLiquidityPoolV1Converter(event);
            LiquidityPoolV1ConverterTemplate.create(event.params._converter);
        }
    }

    let platform = createAndReturnPlatformStat();
    platform.numConvertersTracked = platform.numConvertersTracked.plus(BigInt.fromI32(1));
    platform.save()
}

function _createAndReturnLiquidityPoolV2Converter(event: NewConverterEvent): ConverterEntity {
    let id = event.params._converter.toHexString();
    let converter = ConverterEntity.load(id);

    let converterContract = LiquidityPoolV2ConverterContract.bind(event.params._converter);
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

function _createAndReturnLiquidityPoolV1Converter(event: NewConverterEvent): ConverterEntity {
    let id = event.params._converter.toHexString();
    let converter = ConverterEntity.load(id);

    let converterContract = LiquidityPoolV1ConverterContract.bind(event.params._converter);
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

function _createAndReturnConverter27(event: NewConverterEvent): ConverterEntity {
    let id = event.params._converter.toHexString();
    log.debug("_createAndReturnConverter27 {}", [id])
    let converter = ConverterEntity.load(id);

    let converterContract = Converter27Contract.bind(event.params._converter);
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

function _createAndReturnConverter25(event: NewConverterEvent): ConverterEntity {
    let id = event.params._converter.toHexString();
    log.debug("_createAndReturnConverter25 {}", [id])
    let converter = ConverterEntity.load(id);

    let converterContract = Converter25Contract.bind(event.params._converter);
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
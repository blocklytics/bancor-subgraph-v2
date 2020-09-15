import { 
    NewConverter as NewConverterEvent,
    OwnerUpdate as OwnerUpdateEvent 
} from '../../../generated/ConverterFactory2-0xc9cd0b17c887e27ae5cc2d8e040eb763232eb348/ConverterFactory'
import {
    LiquidityPoolV2Converter as LiquidityPoolV2ConverterContract
} from '../../../generated/ConverterFactory2-0xc9cd0b17c887e27ae5cc2d8e040eb763232eb348/LiquidityPoolV2Converter'
import {
    LiquidityPoolV1Converter as LiquidityPoolV1ConverterContract
} from '../../../generated/ConverterFactory2-0xc9cd0b17c887e27ae5cc2d8e040eb763232eb348/LiquidityPoolV1Converter'
import {
    LiquidityPoolV2Converter as LiquidityPoolV2ConverterTemplate
} from '../../../generated/templates'
import {
    LiquidityPoolV1Converter as LiquidityPoolV1ConverterTemplate
} from '../../../generated/templates'
import { 
    Converter as ConverterEntity 
} from '../../../generated/schema'
import { createAndReturnPlatformStat } from '../helpers'
import { log, BigDecimal, BigInt } from '@graphprotocol/graph-ts'

export function handleNewConverter(event: NewConverterEvent): void {
    let id = event.params._converter.toHexString();
    let converter = ConverterEntity.load(id);
    let converterType = BigInt.fromI32(event.params._type);

    if (converter === null) {
        if (converterType.equals(BigInt.fromI32(2))) {
            LiquidityPoolV2ConverterTemplate.create(event.params._converter)
        }
        else if (converterType.equals(BigInt.fromI32(1))) {
            LiquidityPoolV1ConverterTemplate.create(event.params._converter)
        }
        else {
            log.warning("handleNewConverter {} not handled - type {} not supported from factory {}", [
                id, converterType.toString(), event.address.toHexString()
            ])
            return
        }
        let converterContract = LiquidityPoolV2ConverterContract.bind(event.params._converter);
        let anchorResult = converterContract.try_anchor();
        let conversionFeeResult = converterContract.try_conversionFee();
        let isActiveResult = converterContract.try_isActive();
        let versionResult = converterContract.try_version();
        let priceOracleResult = converterContract.try_priceOracle();

        if (anchorResult.reverted || conversionFeeResult.reverted || isActiveResult.reverted || versionResult.reverted) {
            log.warning("handleNewConverter {} not handled (type {})", [id, converterType.toString()])
            return
        }

        // let converterContract = LiquidityPoolV1ConverterContract.bind(event.params._converter);
        // let typeResult = converterContract.try_converterType();
        // log.debug("typeResult {} {}", [
        //     typeResult.reverted ? "reverted" : "ok",
        //     typeResult.reverted ? "" : BigInt.fromI32(typeResult.value).toString()
        // ])

        converter = new ConverterEntity(id);
        converter.activated = isActiveResult.value;
        converter.anchor = anchorResult.value.toHexString();
        converter.conversionFee = conversionFeeResult.value.divDecimal(BigDecimal.fromString("1000000")); // Conversion fee is given in ppm
        converter.factory = event.address.toHexString();
        converter.platform = "Bancor";
        converter.priceOracle = priceOracleResult.reverted ? null : priceOracleResult.value.toHexString();
        converter.type = converterType;
        converter.version = BigInt.fromI32(versionResult.value);
        converter.numSwaps = BigInt.fromI32(0);
        converter.createdAtTimestamp = event.block.timestamp;
        converter.createdAtBlockNumber = event.block.number;
        converter.createdAtLogIndex = event.logIndex;
        converter.createdAtTransaction = event.transaction.hash.toHexString();
        converter.save();
    }

    let platform = createAndReturnPlatformStat();
    platform.numConvertersTracked = platform.numConvertersTracked.plus(BigInt.fromI32(1));
    platform.save()
}

export function handleOwnerUpdate(event: OwnerUpdateEvent): void {}

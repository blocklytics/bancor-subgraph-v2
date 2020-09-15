import { 
    ConverterAnchorAdded as ConverterAnchorAddedEvent,
    ConverterAnchorRemoved as ConverterAnchorRemovedEvent,
    ConvertibleTokenAdded as ConvertibleTokenAddedEvent,
    ConvertibleTokenRemoved as ConvertibleTokenRemovedEvent,
    LiquidityPoolAdded as LiquidityPoolAddedEvent,
    LiquidityPoolRemoved as LiquidityPoolRemovedEvent,
    OwnerUpdate as OwnerUpdateEvent,
    SmartTokenAdded as SmartTokenAddedEvent,
    SmartTokenRemoved as SmartTokenRemovedEvent
} from '../../generated/ConverterRegistry/ConverterRegistry'
import { 
    Converter as ConverterEntity
} from '../../generated/schema'
import { log, BigInt } from '@graphprotocol/graph-ts'

export function handleConverterAnchorAdded(event: ConverterAnchorAddedEvent): void {
    log.debug("handleConverterAnchorAdded {}", [event.params._anchor.toHexString()])
}

export function handleConverterAnchorRemoved(event: ConverterAnchorRemovedEvent): void {
    log.debug("handleConverterAnchorRemoved {}", [event.params._anchor.toHexString()])
}

export function handleConvertibleTokenAdded(event: ConvertibleTokenAddedEvent): void {
    log.debug("handleConvertibleTokenAdded {} {}", [
        event.params._convertibleToken.toHexString(),
        event.params._smartToken.toHexString()
    ])
}

export function handleConvertibleTokenRemoved(event: ConvertibleTokenRemovedEvent): void {
    log.debug("handleConvertibleTokenAdded {} {}", [
        event.params._convertibleToken.toHexString(),
        event.params._smartToken.toHexString()
    ])
}

export function handleLiquidityPoolAdded(event: LiquidityPoolAddedEvent): void {
    log.debug("handleLiquidityPoolAdded {}", [event.params._liquidityPool.toHexString()])
}

export function handleLiquidityPoolRemoved(event: LiquidityPoolRemovedEvent): void {
    log.debug("handleLiquidityPoolRemoved {}", [event.params._liquidityPool.toHexString()])
}

export function handleOwnerUpdated(event: OwnerUpdateEvent): void {
    log.debug("handleOwnerUpdated {}", [event.params._newOwner.toHexString()])
}

export function handleSmartTokenAdded(event: SmartTokenAddedEvent): void {
    log.debug("handleSmartTokenAdded {}", [event.params._smartToken.toHexString()])
}

export function handleSmartTokenRemoved(event: SmartTokenRemovedEvent): void {
    log.debug("handleSmartTokenRemoved {}", [event.params._smartToken.toHexString()])
}
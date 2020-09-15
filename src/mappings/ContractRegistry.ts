import { 
    AddressUpdate as AddressUpdateEvent,
    OwnerUpdate as OwnerUpdateEvent 
} from '../../generated/ContractRegistry/ContractRegistry'
import {
    ConverterFactory as ConverterFactoryTemplate
} from '../../generated/templates'
import { log } from '@graphprotocol/graph-ts'

export function handleAddressUpdate(event: AddressUpdateEvent): void {
    log.debug("handleAddressUpdate {} {}", [
        event.params._contractName.toString(),
        event.params._contractAddress.toHexString()
    ])

    if (event.params._contractName.toString() == "BancorConverterFactory") {
        // create converter factory template
        ConverterFactoryTemplate.create(event.params._contractAddress)
    }
}

export function handleOwnerUpdate(event: OwnerUpdateEvent): void {}
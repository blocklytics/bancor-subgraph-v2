import { 
    Converter as ConverterEntity,
    ConverterBalance as ConverterBalanceEntity,
    LiquidityProviderBalance as LiquidityProviderBalanceEntity,
    PoolToken as PoolTokenEntity,
    Swap as SwapEntity,
    Token as TokenEntity,
    User as UserEntity,
    VolumeStat as VolumeStatEntity,
    PlatformStat as PlatformStatEntity,
    PlatformStat
} from '../../generated/schema'
import { log, BigDecimal, BigInt, Address } from '@graphprotocol/graph-ts'

export const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"

export function createAndReturnConverter(converterAddress: Address): ConverterEntity {
    let id = converterAddress.toHexString();
    let converter = ConverterEntity.load(id);
    if (converter === null) {
        log.warning("_createAndReturnConverter Converter not found {}", [id])
        converter = new ConverterEntity(id);
        converter.save()
    }

    return converter!
}

export function createAndReturnUser(userAddress: Address): UserEntity {
    let id = userAddress.toHexString();
    let user = UserEntity.load(id);
    if (user === null) {
        user = new UserEntity(id);
        user.save()
    }
    return user!
}

export function createAndReturnPlatformStat(): PlatformStatEntity {
    let platform = PlatformStatEntity.load("Bancor");
    if (platform === null) {
        platform = new PlatformStatEntity("Bancor");
        platform.numActiveConverters = BigInt.fromI32(0);
        platform.numConvertersTracked = BigInt.fromI32(0);
        platform.swaps = BigInt.fromI32(0);
        platform.save()
    }
    return platform!
}

export function createAndReturnConverterVolumeStat(converterAddress: Address, tokenAddress: Address): VolumeStatEntity {
    let converter = converterAddress.toHexString();
    let token = tokenAddress.toHexString();

    let platform = createAndReturnPlatformStat();

    let volumeStat = VolumeStatEntity.load(converter + "-" + token);
    if (volumeStat === null) {
        volumeStat = new VolumeStatEntity(converter + "-" + token);
        volumeStat.converter = converter;
        volumeStat.token = token;
        volumeStat.buyVolume = BigDecimal.fromString("0.0");
        volumeStat.sellVolume = BigDecimal.fromString("0.0");
        volumeStat.totalVolume = BigDecimal.fromString("0.0");
        volumeStat.platform = platform.id;
        volumeStat.save();
    }
    return volumeStat!
}
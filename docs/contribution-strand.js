// Public v3 strand; no private registry fields, model execution or network actions.
import {createContributionWalContract,HEADER as V2_HEADER} from './contribution-wal.js';
export {LIMITS} from './contribution-wal.js';
export const SCHEMA='reckoner.public-contribution-wal.experimental.v3';
export const HEADER=Object.freeze([...V2_HEADER.slice(0,12),'bitnet_sidecars','microtheories',...V2_HEADER.slice(12)]);
export const {appendContributionWal,verifyContributionWal,safeViewingProjection}=createContributionWalContract({schema:SCHEMA,header:HEADER,extensionColumns:['bitnet_sidecars','microtheories']});

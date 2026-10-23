import {createHash} from 'node:crypto';
import {decodeStellarValue,timeBounds} from '../ledgerclock-decoder/index.mjs';
export function review(input){
 if(input?.schema!==1||!Number.isInteger(input.initialProtocol)||input.initialProtocol<23||input.initialProtocol>30||!Array.isArray(input.ledgers)||input.ledgers.length<1||input.ledgers.length>1000)throw Error('Invalid bounded corpus');
 let previousProtocol=input.initialProtocol,previous=null;const findings=[],rows=[];
 for(const item of input.ledgers){
  if(!Number.isInteger(item.sequence)||item.sequence<1||item.sequence>4294967295||!Number.isInteger(item.protocol)||item.protocol<previousProtocol||item.protocol>30)throw Error('Invalid sequence or protocol');
  if(previous&&item.sequence!==previous.sequence+1)throw Error('Corpus must be contiguous and ordered');
  const value=decodeStellarValue(item.valueXdr),ms=BigInt(value.effectiveMs),msArm=value.arm>=3;
  if(msArm!==(previousProtocol>=30))findings.push({sequence:item.sequence,code:'PROTOCOL_ARM_MISMATCH'});
  if(previous&&ms<=BigInt(previous.value.effectiveMs))findings.push({sequence:item.sequence,code:'NON_INCREASING_EFFECTIVE_TIME'});
  if(previous&&value.closeTime===previous.value.closeTime)findings.push({sequence:item.sequence,code:'SHARED_WHOLE_SECOND',severity:'compatibility'});
  const valid=timeBounds(value,input.timeBounds?.minTime??'0',input.timeBounds?.maxTime??'0');
  rows.push({sequence:item.sequence,protocol:item.protocol,...value,timeBoundsValid:valid});
  previous={sequence:item.sequence,value};previousProtocol=item.protocol;
 }
 return {schema:1,inputSha256:createHash('sha256').update(JSON.stringify(input)).digest('hex'),provenance:typeof input.provenance==='string'?input.provenance.slice(0,500):'unspecified',signatureVerified:false,timeBounds:{minTime:input.timeBounds?.minTime??'0',maxTime:input.timeBounds?.maxTime??'0'},findings,rows,valid:!findings.some(x=>x.code!=='SHARED_WHOLE_SECOND')};
}
export function compareLegacy(report){return report.rows.map(r=>({sequence:r.sequence,correctTimeBounds:r.timeBoundsValid,incorrectMillisecondsAsSeconds:timeBounds({...r,closeTime:r.effectiveMs},report.timeBounds.minTime,report.timeBounds.maxTime),lostSubsecondPrecision:r.precision==='millisecond'&&BigInt(r.effectiveMs)%1000n!==0n}))}

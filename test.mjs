import test from 'node:test';import assert from 'node:assert/strict';import {review,compareLegacy} from './index.mjs';import {sample,encodeValue} from '../ledgerclock-fixtures/index.mjs';const copy=()=>structuredClone(sample);
test('upgrade ledger uses old arm; following ledger uses ms',()=>assert.equal(review(copy()).valid,true));
test('same-second ledgers retain time bound validity',()=>assert.deepEqual(review(copy()).rows.map(x=>x.timeBoundsValid),[true,true,true,false]));
test('detects wrong upgrade boundary',()=>{const s=copy();s.initialProtocol=30;assert.equal(review(s).findings[0].code,'PROTOCOL_ARM_MISMATCH')});
test('refuses sequence gap',()=>{const s=copy();s.ledgers[2].sequence++;assert.throws(()=>review(s))});
test('detects backwards millisecond clock',()=>{const s=copy();s.ledgers[2].valueXdr=encodeValue({closeTimeMs:'1800000000100'});assert.equal(review(s).valid,false)});
test('bad unit adapter demonstrably changes validity',()=>assert.equal(compareLegacy(review(copy()))[1].incorrectMillisecondsAsSeconds,false));
test('stable input digest',()=>assert.equal(review(copy()).inputSha256,review(copy()).inputSha256));
test('rejects empty corpus',()=>assert.throws(()=>review({...sample,ledgers:[]})));

import assert from 'node:assert/strict';
import {parseMinor,money} from '../src/lib/money.ts';
const cases=['0.01','1.23','125,25','9999999999.99'];
const actual=cases.map(input=>({input,minor:parseMinor(input)}));
assert.deepEqual(actual.map(v=>v.minor),[1,123,12525,999999999999]);
for (const input of ['0','-1','1.234','1e3','NaN','10000000000.00']) assert.throws(()=>parseMinor(input));
assert.throws(()=>money(1.5,'BRL'));
assert.throws(()=>money(100,'<svg>'));
console.log(JSON.stringify({converted:actual,invalid_values_rejected:8,formatted:money(12525,'BRL')}));

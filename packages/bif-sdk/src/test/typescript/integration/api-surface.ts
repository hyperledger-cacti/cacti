// tslint:disable-next-line: no-var-requires
const tap = require('tap');
import { ApiClient, ConsortiumService } from '../../../main/typescript/public-api';

tap.pass('Test file can be executed');

tap.test('Library can be loaded', (assert: any) => {
  assert.plan(2);
  assert.ok(ApiClient);
  assert.ok(ConsortiumService);
});

// tslint:disable-next-line: no-var-requires
const tap = require('tap');
import { BesuTestLedger } from '../../../../../main/typescript/public-api';
import { Container } from 'dockerode';

tap.test('constructor throws if invalid input is provided', (assert: any) => {
  assert.ok(BesuTestLedger);
  assert.throws(() => new BesuTestLedger({ containerImageVersion: 'nope' }));
  assert.end();
});

tap.test('constructor does not throw if valid input is provided', (assert: any) => {
  assert.ok(BesuTestLedger);
  assert.doesNotThrow(() => new BesuTestLedger());
  assert.end();
});

tap.test('starts/stops/destroys a docker container', async (assert: any) => {
  const besuTestLedger = new BesuTestLedger();
  const container: Container = await besuTestLedger.start();
  assert.ok(container);
  const ipAddress: string = await besuTestLedger.getContainerIpAddress();
  assert.ok(ipAddress);
  assert.ok(ipAddress.length);
  await besuTestLedger.stop();
  await besuTestLedger.destroy();
  assert.end();
});

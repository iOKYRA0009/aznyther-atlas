import {test} from 'node:test';
import * as engine from './core.mjs';
import {runTests} from './test-suite.mjs';
import {runIntegrationTests} from './integration-tests.mjs';
test('Regras originais',()=>{console.log(runTests(engine)+' verificações aprovadas');});
test('Integrações',()=>{console.log(runIntegrationTests(engine)+' verificações aprovadas');});

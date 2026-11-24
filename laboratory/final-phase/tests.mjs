import {test} from 'node:test';
import {view,apply,fixture} from './core.mjs';
import {runTests} from './test-suite.mjs';
test('Regras dos quatro módulos',()=>{console.log(runTests({view,apply,fixture})+' verificações aprovadas');});

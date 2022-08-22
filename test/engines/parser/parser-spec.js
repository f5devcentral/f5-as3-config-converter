/**
 * Copyright 2022 F5 Networks, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const assert = require('assert');
const sinon = require('sinon');
const parse = require('../../../src/engines/parser');
const readFiles = require('../../../src/preConverter/readFiles');
const log = require('../../../src/util/log');

const ex1 = require('./ex1.json');
const ex2 = require('./ex2.json');
const ex3 = require('./ex3.json');
const ex4 = require('./ex4.json');
const ex5 = require('./ex5.json');
const ex6 = require('./ex6.json');
const ex7 = require('./ex7.json');
const ex8 = require('./ex8.json');
const ex9 = require('./ex9.json');
const ex10 = require('./ex10.json');
const ex11 = require('./ex11.json');
const ex12 = require('./ex12.json');
const ex13 = require('./ex13.json');
const ex14 = require('./ex14.json');
const ex15 = require('./ex15.json');
// no json counterparts for ex16.conf and ex17.conf because of a thrown exception or a warning

describe('Parse the config (parse.js)', () => {
    it('should parse the bigip-object into json-object', async () => {
        const data = await readFiles(['./test/engines/parser/ex1.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex1, json);
    });

    it('should parse nested bigip-objects into json-objects', async () => {
        const data = await readFiles(['./test/engines/parser/ex2.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex2, json);
    });

    it('should handle a mix of different data types', async () => {
        const data = await readFiles(['./test/engines/parser/ex3.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex3, json);
    });

    it('should handle iRules', async () => {
        const data = await readFiles(['./test/engines/parser/ex4.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex4, json);
    });

    it('should handle multiple iRules', async () => {
        const data = await readFiles(['./test/engines/parser/ex5.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex5, json);
    });

    it('should handle irregular (user-defined) indentation in iRules', async () => {
        const data = await readFiles(['./test/engines/parser/ex6.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex6, json);
    });

    it('should recognize a quoted string', async () => {
        const data = await readFiles(['./test/engines/parser/ex7.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex7, json);
    });

    it('should recognize a multiline string', async () => {
        const data = await readFiles(['./test/engines/parser/ex8.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex8, json);
    });

    it('should handle escape chars', async () => {
        const data = await readFiles(['./test/engines/parser/ex9.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex9, json);
    });

    it('should skip "cli script" and "sys crypto cert-order-manager" sections', async () => {
        const data = await readFiles(['./test/engines/parser/ex10.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex10, json);
    });

    it('should handle windows line endings', async () => {
        const data = await readFiles(['./test/engines/parser/ex11.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex11, json);
    });

    it('should handle {} within string value', async () => {
        const data = await readFiles(['./test/engines/parser/ex12.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex12, json);
    });

    it('should handle invalid CSS', async () => {
        const data = await readFiles(['./test/engines/parser/ex13.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex13, json);
    });

    it('should right filter commented lines', async () => {
        const data = await readFiles(['./test/engines/parser/ex14.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex14, json);
    });

    it('should handle an unnamed array of objects', async () => {
        const data = await readFiles(['./test/engines/parser/ex15.conf']);
        const json = parse(data);
        assert.deepStrictEqual(ex15, json);
    });

    it('should throw an exception for mis-indented "}"', async () => {
        const data = await readFiles(['./test/engines/parser/ex16.conf']);
        assert.throws(
            () => parse(data),
            Error
        );
        assert.throws(
            () => parse(data),
            /.*Missing or mis-indented '}' for line: ' {4}devices {'$/
        );
    });

    it('should give a warning for mis-indented property', async () => {
        const consoleLogSpy = sinon.spy(log, 'warn');
        const data = await readFiles(['./test/engines/parser/ex17.conf']);
        parse(data);
        sinon.assert.callCount(consoleLogSpy, 1);
        sinon.assert.calledWith(consoleLogSpy, "UNRECOGNIZED LINE: 'auto-sync enabled'");
    });
});

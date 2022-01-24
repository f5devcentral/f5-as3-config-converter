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
const buildProtectedObj = require('../../src/util/convert/buildProtectedObj');
const convertToNameValueObj = require('../../src/util/convert/convertToNameValueObj');
const declarationBase = require('../../src/util/convert/declarationBase');
const dedupeArray = require('../../src/util/convert/dedupeArray');
const enabledToEnable = require('../../src/util/convert/enabledToEnable');
const findLocation = require('../../src/util/convert/findLocation');
const formatStr = require('../../src/util/convert/formatStr');
const getCidrFromNetmask = require('../../src/util/convert/getCidrFromNetmask');
const getMergedAS3Properties = require('../../src/util/getMergedAS3Properties');
const getObjectType = require('../../src/util/convert/getObjectType');
const handleObjectRef = require('../../src/util/convert/handleObjectRef');
const hyphensToCamel = require('../../src/util/convert/hyphensToCamel');
const isInteger = require('../../src/util/convert/isInteger');
const isIPv4 = require('../../src/util/convert/isIPv4');
const isIPv6 = require('../../src/util/convert/isIPv6');
const prependObjProps = require('../../src/util/convert/prependObjProps');
const returnEmptyObjIfNone = require('../../src/util/convert/returnEmptyObjIfNone');
const unquote = require('../../src/util/convert/unquote');

describe('Converter utils (util/convert)', () => {
    describe('buildProtectedObject', () => {
        it('should build from a protected property', () => {
            const input = 'f5f5'.toString('base64');
            const output = buildProtectedObj(input);
            const expected = {
                ciphertext: 'ZjVmNQ==',
                protected: 'eyJhbGciOiJkaXIiLCJlbmMiOiJub25lIn0=',
                ignoreChanges: true
            };
            assert.deepStrictEqual(output, expected);
        });

        it('should build from an unprotected property', () => {
            const input = '$M$f5f5enctext'.toString('base64');
            const output = buildProtectedObj(input);
            const expected = {
                ciphertext: 'JE0kZjVmNWVuY3RleHQ=',
                protected: 'eyJhbGciOiJkaXIiLCJlbmMiOiJmNXN2In0=',
                ignoreChanges: true
            };
            assert.deepStrictEqual(output, expected);
        });
    });

    describe('convertToNameValueObj', () => {
        it('should convert a string to object', () => {
            const input = '"foo: bar"';
            const output = convertToNameValueObj(input);
            assert.deepStrictEqual(output, { name: 'foo', value: 'bar' });
        });

        it('should convert an actual value', () => {
            const input = '"ip: IP::remote_addr"';
            const output = convertToNameValueObj(input);
            assert.deepStrictEqual(output, { name: 'ip', value: 'IP::remote_addr' });
        });

        it('should handle an "empty" value', () => {
            const input = 'X-Header-Insert:';
            const output = convertToNameValueObj(input);
            assert.deepStrictEqual(output, { name: 'X-Header-Insert', value: '' });
        });
    });

    describe('declarationBase', () => {
        describe('.AS3', () => {
            it('should return the base json', () => {
                const output = declarationBase.AS3();
                assert.strictEqual(output.class, 'ADC');
                assert.strictEqual(output.label, 'Converted Declaration');
                assert.strictEqual(output.remark, 'Generated by Automation Config Converter');
            });

            it('should optionally add the controls stanza', () => {
                const output = declarationBase.AS3({ controls: true });
                assert.deepStrictEqual(output.controls, {
                    class: 'Controls',
                    trace: true,
                    logLevel: 'debug'
                });
            });
        });

        describe('.DO', () => {
            it('should return the base json', () => {
                const output = declarationBase.DO();
                assert.strictEqual(output.class, 'Device');
                assert(output.async);
            });

            it('should optionally add the controls stanza', () => {
                const output = declarationBase.DO({ controls: true });
                assert.strictEqual(output.controls.class, 'Controls');
                assert(output.controls.userAgent.includes('F5-AUTOMATION-CONFIG-CONVERTER'));
                assert(output.controls.trace);
                assert(output.controls.traceResponse);
                assert(!output.controls.dryRun);
            });
        });
    });

    describe('dedupeArray', () => {
        it('should remove duplicate strings', () => {
            const input = ['hi', 'test', 'str', 'hi'];
            const output = dedupeArray(input);
            assert.deepStrictEqual(output, ['hi', 'test', 'str']);
        });

        it('should remove duplicate ref objects', () => {
            const input = [{ use: 'test' }, { use: 'another' }, { use: 'test' }];
            const output = dedupeArray(input);
            assert.deepStrictEqual(output, [{ use: 'test' }, { use: 'another' }]);
        });

        it('should handle both simultaneously', () => {
            const input = ['hi', { use: 'test' }, '3', 'hi', { use: 'the' }, { use: 'test' }];
            const output = dedupeArray(input);
            assert.deepStrictEqual(output, ['hi', { use: 'test' }, '3', { use: 'the' }]);
        });
    });

    describe('enabledToEnable', () => {
        it('should handle "enabled"', () => {
            const input = 'enabled';
            const output = enabledToEnable(input);
            assert.strictEqual(output, 'enable');
        });

        it('should handle "disabled"', () => {
            const input = 'disabled';
            const output = enabledToEnable(input);
            assert.strictEqual(output, 'disable');
        });

        it('should not handle anything else', () => {
            const input = 'auto';
            const output = enabledToEnable(input);
            assert.strictEqual(output, 'auto');
        });
    });

    describe('findLocation', () => {
        it('should split the BIG-IP path', () => {
            const input = '/Tenant1/App1/Profile1';
            const output = findLocation(input);
            assert.deepStrictEqual(output, {
                app: 'App1',
                iapp: false,
                original: '/Tenant1/App1/Profile1',
                profile: 'Profile1',
                tenant: 'Tenant1'
            });
        });

        // AS3 supports '.' and '-' in names and pathes since v3.17.1
        it('should save chars ._-', () => {
            const input = '/Te_nan.t1/App-1/Prof.ile1';
            const output = findLocation(input);
            assert.deepStrictEqual(output, {
                app: 'App-1',
                iapp: false,
                original: '/Te_nan.t1/App-1/Prof.ile1',
                profile: 'Prof.ile1',
                tenant: 'Te_nan.t1'
            });
        });
    });

    describe('formatStr', () => {
        it('should trim path to 194 symbols', () => {
            const input = '/AS3_Tenant_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/AS3_Application_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/Profile_name_longer_than_194qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqaaaa';
            const output = formatStr(input);
            assert.strictEqual(output, '/AS3_Tenant_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/AS3_Application_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/Profile_name_longer_than_194qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
        });

        it('should return 3rd element as object name if name not quoted', () => {
            const input = 'ltm vurtual /AS3_Tenant_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/AS3_Application_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/Profile_name_longer_than_194qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqaaaa';
            const output = formatStr(input);
            assert.strictEqual(output, '/AS3_Tenant_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/AS3_Application_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/Profile_name_longer_than_194qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
        });
        it('should replace spaces with _ if profile name quoted', () => {
            const input = 'ltm vurtual "/AS3_Tenant_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/AS3_Application_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/Profile_name_longer_than_194 with spaces qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqaaaa"';
            const output = formatStr(input);
            assert.strictEqual(output, '/AS3_Tenant_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/AS3_Application_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/Profile_name_longer_than_194_with_spaces_qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
        });

        it('should remove leading _', () => {
            const input = 'ltm vurtual "/AS3_Tenant_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwww/AS3_Application_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/_Profile_name_longer_than_194 with spaces qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqaaaa"';
            const output = formatStr(input);
            assert.strictEqual(output, '/AS3_Tenant_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwww/AS3_Application_longer_than_48wwwwwwwwwwwwwwwwwwwwwwwwww/_Profile_name_longer_than_194_with_spaces_qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
        });
    });

    describe('getCidrFromNetmask', () => {
        it('should convert netmask to cidr', () => {
            const input = '255.255.240.0';
            const output = getCidrFromNetmask(input);
            assert.strictEqual(output, '/20');
        });

        it('should convert with noSlash option', () => {
            const input = '255.240.0.0';
            const output = getCidrFromNetmask(input, true);
            assert.strictEqual(output, 12);
        });
    });

    describe('getObjectType', () => {
        it('should return the correct object type', () => {
            const input = { 'ltm profile http /AS3_Tenant/AS3_Application/webtls': {} };
            const output = getObjectType('/AS3_Tenant/AS3_Application/webtls', input);
            assert.strictEqual(output, 'http');
        });

        it('should only work on ltm objects', () => {
            const input = { 'analytics gui-widget /Common/12345678910': {} };
            const output = getObjectType('/Common/12345678910', input);
            assert.strictEqual(output, false);
        });
    });

    describe('handleObjectRef', () => {
        it('should recognize default objects', () => {
            const input = '/Common/http';
            const output = handleObjectRef(input);
            assert.deepStrictEqual(output, { bigip: '/Common/http' });
        });

        it('should handle custom objects', () => {
            const input = '/Common/custom_thing';
            const output = handleObjectRef(input);
            assert.deepStrictEqual(output, { use: '/Common/Shared/custom_thing' });
        });
    });

    describe('hyphensToCamel', () => {
        it('should convert from hyphen-case to camelCase', () => {
            const input = 'example-string-here';
            const output = hyphensToCamel(input);
            assert.strictEqual(output, 'exampleStringHere');
        });
    });

    describe('isInteger', () => {
        it('should return true if integer', () => {
            const input = 12345;
            const output = isInteger(input);
            assert.strictEqual(output, true);
        });

        it('should return true if stringified integer', () => {
            const input = '12345';
            const output = isInteger(input);
            assert.strictEqual(output, true);
        });

        it('should return false if true string', () => {
            const input = '1a2b3c';
            const output = isInteger(input);
            assert.strictEqual(output, false);
        });
    });

    describe('isIPv4', () => {
        it('should return true if ipv4', () => {
            const input = '192.168.1.1';
            const output = isIPv4(input);
            assert.strictEqual(output, true);
        });

        it('should handle ipv4 with port', () => {
            const input = '1.1.1.1:1';
            const output = isIPv4(input);
            assert.strictEqual(output, true);
        });

        it('should return false if ipv6', () => {
            const input = 'fdf5:4153:3300::15.0';
            const output = isIPv4(input);
            assert.strictEqual(output, false);
        });
    });

    describe('isIPv6', () => {
        it('should return true if ipv6', () => {
            const input = 'fdf5:4153:3300::15';
            const output = isIPv6(input);
            assert.strictEqual(output, true);
        });

        it('should handle ipv6 with port', () => {
            const input = 'fdf5:4153:3300::15.0';
            const output = isIPv6(input);
            assert.strictEqual(output, true);
        });

        it('should return false if ipv4', () => {
            const input = '192.168.1.1:80';
            const output = isIPv6(input);
            assert.strictEqual(output, false);
        });
    });

    describe('prependObjProps', () => {
        it('should work for hsts, but not enforcement', () => {
            const input = {
                includeSubdomains: true,
                period: 7862400,
                insert: false,
                preload: false
            };
            const output = prependObjProps(input, 'hsts');
            assert.deepStrictEqual(output, {
                hstsIncludeSubdomains: true,
                hstsPeriod: 7862400,
                hstsInsert: false,
                hstsPreload: false
            });
        });
    });

    describe('returnEmptyObjIfNone', () => {
        it('should return empty if the property is "none"', () => {
            const input = { test: 'none' };
            const output = returnEmptyObjIfNone(input.test, input);
            assert.deepStrictEqual(output, {});
        });

        it('should otherwise return in original input', () => {
            const input = { test: 'test test' };
            const output = returnEmptyObjIfNone(input.test, input);
            assert.deepStrictEqual(output, input);
        });
    });

    describe('unquote', () => {
        it('should unquote a string', () => {
            const input = '"Test string"';
            const output = unquote(input);
            assert.strictEqual(output, 'Test string');
        });

        it('should unquote a single-quote string', () => {
            const input = "'Test string'";
            const output = unquote(input);
            assert.strictEqual(output, 'Test string');
        });

        it('should unquote a tilde-quote string', () => {
            const input = '`Test string`';
            const output = unquote(input);
            assert.strictEqual(output, 'Test string');
        });

        it('should not remove other characters', () => {
            const input = 'Test string';
            const output = unquote(input);
            assert.strictEqual(output, 'Test string');
        });
    });

    describe('Test merge properties files (getMergedAS3Properties.js)', () => {
        it('Should merge without losing data', () => {
            const as3Properties = {
                'sys application service': [
                    { id: 'description', altId: 'remark', quotedString: true },
                    { id: 'template' },
                    { id: 'template2' },
                    {
                        id: 'variables',
                        extend: 'objArray',
                        default: null,
                        qwerty: 'qwerty'
                    }
                ]
            };

            const as3PropertiesCustom = {
                // same as existing object
                'sys application service': [
                    // equal id with equal value
                    { id: 'template' },
                    // equal id with more values
                    { id: 'template2', altId: 'tmp' },
                    // equal id with different field value
                    { id: 'variables', default: '', qwerty: 'qwerty' }
                ],
                'sys application': [ // additional object object
                    { id: 'template1' }
                ]
            };

            const ex0 = {
                'sys application service': [
                    { id: 'template' },
                    { id: 'template2', altId: 'tmp' },
                    {
                        id: 'variables',
                        extend: 'objArray',
                        default: null,
                        qwerty: 'qwerty'
                    },
                    { id: 'description', altId: 'remark', quotedString: true }
                ],
                'sys application': [{ id: 'template1' }]
            };

            // extend as3Properties with custom
            const as3PropertiesExt = getMergedAS3Properties(as3Properties, as3PropertiesCustom);
            assert.deepStrictEqual(as3PropertiesExt, ex0);
        });
    });
});
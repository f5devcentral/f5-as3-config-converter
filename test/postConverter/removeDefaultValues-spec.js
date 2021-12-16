/**
 * Copyright 2021 F5 Networks, Inc.
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

const removeDefaultValues = require('../../src/postConverter/removeDefaultValues');

describe('Extended objects (removeDefaultValues.js)', () => {
    it('should remove default values from AS3 objects', () => {
        const extended = {
            class: 'ADC',
            schemaVersion: '3.26.0',
            AS3_Tenant: {
                class: 'Tenant',
                AS3_Application: {
                    class: 'Application',
                    template: 'generic',
                    httpProf: {
                        trustXFF: false,
                        knownMethods: [
                            'CONNECT', 'DELETE', 'GET', 'HEAD',
                            'LOCK', 'OPTIONS', 'POST', 'PROPFIND',
                            'PUT', 'TRACE', 'UNLOCK'
                        ],
                        maxRequests: 0,
                        pipelineAction: 'allow',
                        unknownMethodAction: 'allow',
                        hstsIncludeSubdomains: true,
                        hstsPeriod: 7862400,
                        hstsInsert: false,
                        hstsPreload: false,
                        xForwardedFor: true,
                        multiplexTransformations: true,
                        proxyType: 'reverse',
                        rewriteRedirects: 'none',
                        serverHeaderValue: 'BigIP',
                        viaRequest: 'remove',
                        viaResponse: 'remove',
                        class: 'HTTP_Profile'
                    }
                }
            }
        };
        const output = removeDefaultValues(extended);
        const expected = {
            class: 'ADC',
            schemaVersion: '3.26.0',
            AS3_Tenant: {
                class: 'Tenant',
                AS3_Application: {
                    class: 'Application',
                    template: 'generic',
                    httpProf: {
                        class: 'HTTP_Profile'
                    }
                }
            }
        };

        assert.deepStrictEqual(expected, output);
    });

    it('should not fail if inspected object has ref in else block of AS3 schema', () => {
        const extended = {
            class: 'ADC',
            schemaVersion: '3.26.0',
            id: 'urn:uuid:a35f7126-83ca-4100-9772-a7bc4c532da0',
            label: 'Converted Declaration',
            remark: 'Generated by Automation Config Converter',
            AS3_Tenant: {
                class: 'Tenant',
                AS3_Application: {
                    class: 'Application',

                    template: 'generic',
                    vs1: {
                        translateServerAddress: false,
                        translateServerPort: false,
                        class: 'Service_Forwarding',
                        profileL4: {
                            bigip: '/Common/apm-forwarding-fastL4'
                        },
                        forwardingType: 'ip',
                        virtualAddresses: [
                            [
                                '0.0.0.0/0',
                                '10.10.192.0/24'
                            ]
                        ],
                        virtualPort: 0,
                        persistenceMethods: [],
                        layer4: 'any',
                        snat: 'none'
                    }
                }
            }
        };
        const output = removeDefaultValues(extended);
        const expected = {
            class: 'ADC',
            schemaVersion: '3.26.0',
            id: 'urn:uuid:a35f7126-83ca-4100-9772-a7bc4c532da0',
            label: 'Converted Declaration',
            remark: 'Generated by Automation Config Converter',
            AS3_Tenant: {
                class: 'Tenant',
                AS3_Application: {
                    class: 'Application',
                    template: 'generic',
                    vs1: {
                        translateServerAddress: false,
                        translateServerPort: false,
                        class: 'Service_Forwarding',
                        profileL4: {
                            bigip: '/Common/apm-forwarding-fastL4'
                        },
                        forwardingType: 'ip',
                        virtualAddresses: [
                            [
                                '0.0.0.0/0',
                                '10.10.192.0/24'
                            ]
                        ],
                        virtualPort: 0,
                        persistenceMethods: [],
                        snat: 'none'
                    }
                }
            }
        };
        assert.deepStrictEqual(expected, output);
    });

    it('should not fail on UNCERTAIN_CERT', () => {
        const extended = {
            class: 'ADC',
            schemaVersion: '3.26.0',
            id: 'urn:uuid:a35f7126-83ca-4100-9772-a7bc4c532da0',
            label: 'Converted Declaration',
            remark: 'Generated by Automation Config Converter',
            AS3_Tenant: {
                class: 'Tenant',
                AS3_Application: {
                    class: 'Application',
                    edge_case: {
                        certificates: [
                            {
                                certificate: '/Common/Shared/default_certificate'
                            }
                        ],
                        class: 'UNCERTAIN_CERT',
                        tls1_0Enabled: false,
                        tls1_1Enabled: false,
                        tls1_2Enabled: true,
                        tls1_3Enabled: true,
                        singleUseDhEnabled: false,
                        insertEmptyFragmentsEnabled: false
                    }
                }
            }
        };

        const output = removeDefaultValues(extended);
        const expected = {
            class: 'ADC',
            schemaVersion: '3.26.0',
            id: 'urn:uuid:a35f7126-83ca-4100-9772-a7bc4c532da0',
            label: 'Converted Declaration',
            remark: 'Generated by Automation Config Converter',
            AS3_Tenant: {
                class: 'Tenant',
                AS3_Application: {
                    class: 'Application',
                    edge_case: {
                        certificates: [
                            {
                                certificate: '/Common/Shared/default_certificate'
                            }
                        ],
                        class: 'UNCERTAIN_CERT',
                        tls1_0Enabled: false,
                        tls1_1Enabled: false,
                        tls1_2Enabled: true,
                        tls1_3Enabled: true,
                        singleUseDhEnabled: false,
                        insertEmptyFragmentsEnabled: false
                    }
                }
            }
        };
        assert.deepStrictEqual(expected, output);
    });
});

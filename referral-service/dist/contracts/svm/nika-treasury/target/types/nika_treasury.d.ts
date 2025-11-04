export type NikaTreasury = {
    "address": "EkEP6vRisXSE4TSBDvr8FcpzZgSaYeVKc9uRdFpnXQVB";
    "metadata": {
        "name": "nikaTreasury";
        "version": "0.1.0";
        "spec": "0.1.0";
        "description": "Created with Anchor";
    };
    "instructions": [
        {
            "name": "initialize";
            "discriminator": [
                175,
                175,
                109,
                31,
                13,
                152,
                155,
                237
            ];
            "accounts": [
                {
                    "name": "state";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "authority";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "merkleRoot";
                    "type": {
                        "array": [
                            "u8",
                            32
                        ];
                    };
                }
            ];
        },
        {
            "name": "updateRoot";
            "discriminator": [
                58,
                195,
                57,
                246,
                116,
                198,
                170,
                138
            ];
            "accounts": [
                {
                    "name": "state";
                    "writable": true;
                },
                {
                    "name": "authority";
                    "signer": true;
                    "relations": [
                        "state"
                    ];
                }
            ];
            "args": [
                {
                    "name": "newRoot";
                    "type": {
                        "array": [
                            "u8",
                            32
                        ];
                    };
                }
            ];
        },
        {
            "name": "verifyProof";
            "discriminator": [
                217,
                211,
                191,
                110,
                144,
                13,
                186,
                98
            ];
            "accounts": [
                {
                    "name": "state";
                }
            ];
            "args": [
                {
                    "name": "userId";
                    "type": "string";
                },
                {
                    "name": "token";
                    "type": "string";
                },
                {
                    "name": "amountStr";
                    "type": "string";
                },
                {
                    "name": "proof";
                    "type": {
                        "vec": {
                            "array": [
                                "u8",
                                32
                            ];
                        };
                    };
                }
            ];
            "returns": "bool";
        },
        {
            "name": "viewRoot";
            "discriminator": [
                57,
                250,
                12,
                80,
                132,
                42,
                106,
                167
            ];
            "accounts": [
                {
                    "name": "state";
                }
            ];
            "args": [];
            "returns": {
                "array": [
                    "u8",
                    32
                ];
            };
        }
    ];
    "accounts": [
        {
            "name": "state";
            "discriminator": [
                216,
                146,
                107,
                94,
                104,
                75,
                182,
                177
            ];
        }
    ];
    "events": [
        {
            "name": "proofVerified";
            "discriminator": [
                181,
                54,
                148,
                211,
                237,
                73,
                131,
                232
            ];
        }
    ];
    "errors": [
        {
            "code": 6000;
            "name": "unauthorized";
            "msg": "unauthorized";
        }
    ];
    "types": [
        {
            "name": "proofVerified";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "userId";
                        "type": "string";
                    },
                    {
                        "name": "token";
                        "type": "string";
                    },
                    {
                        "name": "amountStr";
                        "type": "string";
                    },
                    {
                        "name": "valid";
                        "type": "bool";
                    }
                ];
            };
        },
        {
            "name": "state";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "merkleRoot";
                        "type": {
                            "array": [
                                "u8",
                                32
                            ];
                        };
                    },
                    {
                        "name": "version";
                        "type": "u64";
                    },
                    {
                        "name": "authority";
                        "type": "pubkey";
                    }
                ];
            };
        }
    ];
};

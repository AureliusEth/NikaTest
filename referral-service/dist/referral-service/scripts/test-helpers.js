"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractCookie = extractCookie;
exports.apiCall = apiCall;
exports.authenticateUser = authenticateUser;
exports.createUserChain = createUserChain;
exports.makeTrade = makeTrade;
exports.getEarnings = getEarnings;
exports.getNetwork = getNetwork;
exports.assertEarnings = assertEarnings;
exports.generateAndUpdateRoot = generateAndUpdateRoot;
exports.getMerkleProof = getMerkleProof;
exports.claimAndVerify = claimAndVerify;
exports.sleep = sleep;
exports.step = step;
exports.getTreasuryBalance = getTreasuryBalance;
exports.getContractStatus = getContractStatus;
exports.expectError = expectError;
exports.cleanupTestUsers = cleanupTestUsers;
exports.disconnectDatabase = disconnectDatabase;
require("dotenv/config");
const client_1 = require("@prisma/client");
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const prisma = new client_1.PrismaClient();
function extractCookie(setCookieHeader) {
    if (!setCookieHeader)
        return '';
    const match = setCookieHeader.match(/session=([^;]+)/);
    return match ? `session=${match[1]}` : '';
}
async function apiCall(method, path, userId, body, extraHeaders) {
    const url = `${API_BASE_URL}${path}`;
    const headers = {
        'content-type': 'application/json',
        ...extraHeaders,
    };
    if (userId) {
        headers['x-user-id'] = userId;
    }
    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    }
    catch {
        data = { error: responseText };
    }
    if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}\n${JSON.stringify(data, null, 2)}`);
    }
    return data;
}
async function authenticateUser(userId) {
    const email = `${userId}@test.com`;
    const loginUrl = `${API_BASE_URL}/api/auth/login`;
    const loginResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
    });
    if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        throw new Error(`Login failed for ${userId}: ${loginResponse.status} ${errorText}`);
    }
    const loginData = await loginResponse.json();
    const cookie = extractCookie(loginResponse.headers.get('set-cookie'));
    if (!cookie) {
        throw new Error(`No session cookie received for ${userId}`);
    }
    return {
        userId: loginData.userId,
        cookie,
        email
    };
}
async function createUserChain(userIds) {
    const userCookies = new Map();
    console.log(`  Authenticating ${userIds.length} users...`);
    for (const userId of userIds) {
        const userCookie = await authenticateUser(userId);
        userCookies.set(userId, userCookie);
        console.log(`    ✓ ${userId} authenticated (actual userId: ${userCookie.userId})`);
    }
    console.log(`  Creating referral chain...`);
    for (let i = 0; i < userIds.length - 1; i++) {
        const referrerId = userIds[i];
        const refereeId = userIds[i + 1];
        const referrerCookie = userCookies.get(referrerId);
        const refereeCookie = userCookies.get(refereeId);
        const codeResponse = await apiCall('POST', '/api/referral/generate', undefined, undefined, { Cookie: referrerCookie.cookie });
        console.log(`    ✓ ${referrerId} generated code: ${codeResponse.code}`);
        const registerResponse = await apiCall('POST', '/api/referral/register', undefined, { code: codeResponse.code }, { Cookie: refereeCookie.cookie });
        console.log(`    ✓ ${refereeId} registered with ${referrerId} at level ${registerResponse.level}`);
    }
    return userCookies;
}
async function makeTrade(userId, feeAmount, chain = 'EVM', token = 'XP', userCookie) {
    const tradeId = `TRADE_${userId}_${Date.now()}`;
    const headers = userCookie
        ? { Cookie: userCookie.cookie }
        : {};
    await apiCall('POST', '/api/trades/mock', userCookie ? undefined : userId, {
        tradeId,
        userId,
        feeAmount,
        token,
        chain,
    }, headers);
    return tradeId;
}
async function getEarnings(userCookie) {
    const response = await apiCall('GET', '/api/referral/earnings', undefined, undefined, { Cookie: userCookie.cookie });
    return {
        total: response.total || 0,
        byLevel: response.byLevel || {}
    };
}
async function getNetwork(userCookie) {
    const response = await apiCall('GET', '/api/referral/network', undefined, undefined, { Cookie: userCookie.cookie });
    return {
        level1: response.level1 || [],
        level2: response.level2 || [],
        level3: response.level3 || []
    };
}
function assertEarnings(actual, expected, tolerance = 0.01, context = '') {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
        throw new Error(`${context} Earnings mismatch: expected ${expected}, got ${actual} (diff: ${diff})`);
    }
}
async function generateAndUpdateRoot(chain, token = 'XP') {
    const generateResponse = await apiCall('POST', `/api/merkle/generate/${chain}/${token}`);
    console.log(`    ✓ Generated ${chain} merkle root (version ${generateResponse.version})`);
    const updateResponse = await apiCall('POST', `/api/merkle/update-on-chain/${chain}/${token}`);
    console.log(`    ✓ Updated ${chain} on-chain (tx: ${updateResponse.txHash || 'see logs'})`);
    return {
        root: generateResponse.root,
        version: generateResponse.version,
        txHash: updateResponse.txHash
    };
}
async function getMerkleProof(userId, chain, token = 'XP', userCookie) {
    const headers = userCookie ? { Cookie: userCookie.cookie } : undefined;
    const response = await apiCall('GET', `/api/merkle/proof/${chain}/${token}?userId=${userId}`, undefined, undefined, headers);
    return {
        amount: response.amount || 0,
        proof: response.proof || [],
        root: response.root || ''
    };
}
async function claimAndVerify(userId, chain, expectedAmount, userCookie, token = 'XP') {
    const claimResponse = await apiCall('POST', `/api/merkle/claim/${chain}/${token}`, userId, undefined, { Cookie: userCookie.cookie });
    if (claimResponse.amount !== undefined && claimResponse.amount !== expectedAmount) {
        console.warn(`  ⚠️  Claim amount mismatch: expected ${expectedAmount}, got ${claimResponse.amount}`);
    }
    return {
        claimed: claimResponse.claimed || false,
        amount: claimResponse.amount,
        txHash: claimResponse.txHash
    };
}
async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function step(name, fn) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📋 ${name}`);
    console.log('='.repeat(70));
    try {
        await fn();
        console.log(`✅ ${name} - PASSED`);
    }
    catch (error) {
        console.error(`❌ ${name} - FAILED`);
        console.error(error);
        throw error;
    }
}
async function getTreasuryBalance(chain, token = 'XP') {
    const query = await prisma.commissionLedgerEntry.aggregate({
        _sum: { amount: true },
        where: {
            beneficiaryId: 'NIKA_TREASURY',
            destination: 'treasury',
            token
        }
    });
    return Number(query._sum.amount || 0);
}
async function getContractStatus(chain, token = 'XP') {
    const response = await apiCall('GET', `/api/merkle/contract-status/${chain}/${token}`);
    return {
        onChainRoot: response.onChainRoot || '0x0000000000000000000000000000000000000000000000000000000000000000',
        onChainVersion: response.onChainVersion || 0,
        isSynced: response.isSynced || false
    };
}
async function expectError(fn, expectedMessageFragment) {
    try {
        await fn();
        throw new Error(`Expected error containing "${expectedMessageFragment}" but no error was thrown`);
    }
    catch (error) {
        if (!error.message.includes(expectedMessageFragment)) {
            throw new Error(`Expected error containing "${expectedMessageFragment}" but got: ${error.message}`);
        }
    }
}
async function cleanupTestUsers(userIdPattern) {
    await prisma.commissionLedgerEntry.deleteMany({
        where: {
            OR: [
                {
                    beneficiaryId: {
                        contains: userIdPattern
                    }
                },
                {
                    beneficiaryId: 'NIKA_TREASURY',
                    sourceTradeId: {
                        contains: userIdPattern.toUpperCase()
                    }
                }
            ]
        }
    });
    await prisma.trade.deleteMany({
        where: {
            userId: {
                contains: userIdPattern
            }
        }
    });
    await prisma.referralLink.deleteMany({
        where: {
            OR: [
                { referrerId: { contains: userIdPattern } },
                { refereeId: { contains: userIdPattern } }
            ]
        }
    });
    await prisma.user.deleteMany({
        where: {
            email: {
                contains: userIdPattern
            }
        }
    });
    await prisma.idempotencyKey.deleteMany({
        where: {
            key: {
                contains: userIdPattern.toUpperCase()
            }
        }
    });
}
async function disconnectDatabase() {
    await prisma.$disconnect();
}
//# sourceMappingURL=test-helpers.js.map
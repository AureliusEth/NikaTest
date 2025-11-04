"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    try {
        console.log('Updating existing users to 10% cashback rate...');
        const result = await prisma.user.updateMany({
            where: {
                feeCashbackRate: 0,
            },
            data: {
                feeCashbackRate: 0.1,
            },
        });
        console.log(`✅ Updated ${result.count} users to 10% cashback rate`);
        const usersWithCashback = await prisma.user.count({
            where: {
                feeCashbackRate: { gt: 0 },
            },
        });
        const totalUsers = await prisma.user.count();
        console.log(`\n📊 Summary:`);
        console.log(`   Total users: ${totalUsers}`);
        console.log(`   Users with cashback (>0%): ${usersWithCashback}`);
        console.log(`   Users without cashback: ${totalUsers - usersWithCashback}`);
    }
    catch (error) {
        console.error('❌ Error updating users:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=update-cashback-rates.js.map
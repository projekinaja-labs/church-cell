import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { cellId: 'admin' },
        update: {},
        create: {
            cellId: 'admin',
            password: adminPassword,
            name: 'Administrator',
            role: 'admin'
        }
    });
    console.log('✅ Created admin user (ID: admin, Password: admin123)');

    // Create sample leaders and cell groups
    const leader1Password = await bcrypt.hash('leader123', 10);
    const leader1 = await prisma.user.upsert({
        where: { cellId: 'cell001' },
        update: {},
        create: {
            cellId: 'cell001',
            password: leader1Password,
            name: 'John Smith',
            role: 'leader'
        }
    });

    const cellGroup1 = await prisma.cellGroup.upsert({
        where: { leaderId: leader1.id },
        update: {},
        create: {
            name: 'Faith Cell',
            leaderId: leader1.id
        }
    });

    // Add sample members to cell group 1
    const members1 = ['Alice Johnson', 'Bob Williams', 'Carol Davis', 'David Brown'];
    for (const name of members1) {
        await prisma.member.upsert({
            where: {
                id: -1 // This will always fail, causing create
            },
            update: {},
            create: {
                name,
                cellGroupId: cellGroup1.id
            }
        }).catch(() => {
            // Member might already exist, use findFirst + create
            return prisma.member.findFirst({
                where: { name, cellGroupId: cellGroup1.id }
            }).then(existing => {
                if (!existing) {
                    return prisma.member.create({
                        data: { name, cellGroupId: cellGroup1.id }
                    });
                }
            });
        });
    }

    console.log(`✅ Created cell group "${cellGroup1.name}" with leader ${leader1.name} (ID: cell001, Password: leader123)`);

    // Create second cell group
    const leader2Password = await bcrypt.hash('leader123', 10);
    const leader2 = await prisma.user.upsert({
        where: { cellId: 'cell002' },
        update: {},
        create: {
            cellId: 'cell002',
            password: leader2Password,
            name: 'Mary Johnson',
            role: 'leader'
        }
    });

    const cellGroup2 = await prisma.cellGroup.upsert({
        where: { leaderId: leader2.id },
        update: {},
        create: {
            name: 'Hope Cell',
            leaderId: leader2.id
        }
    });

    const members2 = ['Emma Wilson', 'Frank Miller', 'Grace Taylor'];
    for (const name of members2) {
        await prisma.member.findFirst({
            where: { name, cellGroupId: cellGroup2.id }
        }).then(existing => {
            if (!existing) {
                return prisma.member.create({
                    data: { name, cellGroupId: cellGroup2.id }
                });
            }
        });
    }

    console.log(`✅ Created cell group "${cellGroup2.name}" with leader ${leader2.name} (ID: cell002, Password: leader123)`);

    console.log('\n📋 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin:    Cell ID: admin    Password: admin123');
    console.log('Leader 1: Cell ID: cell001  Password: leader123');
    console.log('Leader 2: Cell ID: cell002  Password: leader123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
    .catch((e) => {
        console.error('Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

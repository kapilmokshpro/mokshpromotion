import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'Moksh@123'

interface MPLUser {
    employeeId: string
    name: string
    email: string
    role: string
    department: string | null
}

// 5 Department Admins
const DEPARTMENT_ADMINS: MPLUser[] = [
    { employeeId: 'MPL-SA', name: 'Sales Admin', email: 'sales.admin@mokshpromotion.com', role: 'ADMIN', department: 'SALES' },
    { employeeId: 'MPL-OA', name: 'Operations Admin', email: 'ops.admin@mokshpromotion.com', role: 'ADMIN', department: 'OPERATIONS' },
    { employeeId: 'MPL-GA', name: 'Graphic Admin', email: 'graphic.admin@mokshpromotion.com', role: 'ADMIN', department: 'GRAPHIC' },
    { employeeId: 'MPL-AA', name: 'Account Admin', email: 'account.admin@mokshpromotion.com', role: 'ADMIN', department: 'ACCOUNT' },
    { employeeId: 'MPL-HA', name: 'HR Admin', email: 'hr.admin@mokshpromotion.com', role: 'ADMIN', department: 'HR' },
]

// 30 MPL Users
const MPL_USERS: MPLUser[] = [
    // Sales Team: MPL001 to MPL010 (10 users)
    { employeeId: 'MPL001', name: 'Sales User 1', email: 'mpl001@mokshpromotion.com', role: 'SALES', department: 'SALES' },
    { employeeId: 'MPL002', name: 'Sales User 2', email: 'mpl002@mokshpromotion.com', role: 'SALES', department: 'SALES' },
    { employeeId: 'MPL003', name: 'Sales User 3', email: 'mpl003@mokshpromotion.com', role: 'SALES', department: 'SALES' },
    { employeeId: 'MPL004', name: 'Sales User 4', email: 'mpl004@mokshpromotion.com', role: 'SALES', department: 'SALES' },
    { employeeId: 'MPL005', name: 'Sales User 5', email: 'mpl005@mokshpromotion.com', role: 'SALES', department: 'SALES' },
    { employeeId: 'MPL006', name: 'Sales User 6', email: 'mpl006@mokshpromotion.com', role: 'SALES', department: 'SALES' },
    { employeeId: 'MPL007', name: 'Sales User 7', email: 'mpl007@mokshpromotion.com', role: 'SALES', department: 'SALES' },
    { employeeId: 'MPL008', name: 'Sales User 8', email: 'mpl008@mokshpromotion.com', role: 'SALES', department: 'SALES' },
    { employeeId: 'MPL009', name: 'Sales User 9', email: 'mpl009@mokshpromotion.com', role: 'SALES', department: 'SALES' },
    { employeeId: 'MPL010', name: 'Sales User 10', email: 'mpl010@mokshpromotion.com', role: 'SALES', department: 'SALES' },

    // Operations Team: MPL011 to MPL018 (8 users)
    { employeeId: 'MPL011', name: 'Operations User 1', email: 'mpl011@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL012', name: 'Operations User 2', email: 'mpl012@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL013', name: 'Operations User 3', email: 'mpl013@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL014', name: 'Operations User 4', email: 'mpl014@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL015', name: 'Operations User 5', email: 'mpl015@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL016', name: 'Operations User 6', email: 'mpl016@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL017', name: 'Operations User 7', email: 'mpl017@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL018', name: 'Operations User 8', email: 'mpl018@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },

    // Graphic Team: MPL019 to MPL022 (4 users)
    { employeeId: 'MPL019', name: 'Graphic User 1', email: 'mpl019@mokshpromotion.com', role: 'GRAPHIC', department: 'GRAPHIC' },
    { employeeId: 'MPL020', name: 'Graphic User 2', email: 'mpl020@mokshpromotion.com', role: 'GRAPHIC', department: 'GRAPHIC' },
    { employeeId: 'MPL021', name: 'Graphic User 3', email: 'mpl021@mokshpromotion.com', role: 'GRAPHIC', department: 'GRAPHIC' },
    { employeeId: 'MPL022', name: 'Graphic User 4', email: 'mpl022@mokshpromotion.com', role: 'GRAPHIC', department: 'GRAPHIC' },

    // Account Team: MPL023 to MPL024 (2 users)
    { employeeId: 'MPL023', name: 'Account User 1', email: 'mpl023@mokshpromotion.com', role: 'FINANCE', department: 'ACCOUNT' },
    { employeeId: 'MPL024', name: 'Account User 2', email: 'mpl024@mokshpromotion.com', role: 'FINANCE', department: 'ACCOUNT' },

    // HR Team: MPL025 to MPL026 (2 users)
    { employeeId: 'MPL025', name: 'HR User 1', email: 'mpl025@mokshpromotion.com', role: 'HR', department: 'HR' },
    { employeeId: 'MPL026', name: 'HR User 2', email: 'mpl026@mokshpromotion.com', role: 'HR', department: 'HR' },

    // HR Admin Users: MPL027 to MPL028 (2 users with ADMIN role in HR department)
    { employeeId: 'MPL027', name: 'HR Admin User 1', email: 'mpl027@mokshpromotion.com', role: 'ADMIN', department: 'HR' },
    { employeeId: 'MPL028', name: 'HR Admin User 2', email: 'mpl028@mokshpromotion.com', role: 'ADMIN', department: 'HR' },

    // Unassigned: MPL029 to MPL030 (2 users, no role/department)
    { employeeId: 'MPL029', name: 'User 29', email: 'mpl029@mokshpromotion.com', role: 'UNASSIGNED', department: null },
    { employeeId: 'MPL030', name: 'User 30', email: 'mpl030@mokshpromotion.com', role: 'UNASSIGNED', department: null },
]

async function main() {
    console.log('🚀 Seeding MPL Users...')
    console.log('========================')

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

    // Seed Department Admins
    console.log('\n📋 Creating Department Admins...')
    for (const admin of DEPARTMENT_ADMINS) {
        const user = await prisma.user.upsert({
            where: { email: admin.email },
            update: {
                name: admin.name,
                password: hashedPassword,
                role: admin.role,
                department: admin.department,
                employeeId: admin.employeeId,
            },
            create: {
                employeeId: admin.employeeId,
                name: admin.name,
                email: admin.email,
                password: hashedPassword,
                role: admin.role,
                department: admin.department,
            },
        })
        console.log(`  ✅ ${admin.employeeId} | ${admin.name} | ${admin.role} | Dept: ${admin.department} | ID: ${user.id}`)
    }

    // Seed MPL Users
    console.log('\n👥 Creating MPL Users (MPL001 - MPL030)...')
    for (const mplUser of MPL_USERS) {
        const user = await prisma.user.upsert({
            where: { email: mplUser.email },
            update: {
                name: mplUser.name,
                password: hashedPassword,
                role: mplUser.role,
                department: mplUser.department,
                employeeId: mplUser.employeeId,
            },
            create: {
                employeeId: mplUser.employeeId,
                name: mplUser.name,
                email: mplUser.email,
                password: hashedPassword,
                role: mplUser.role,
                department: mplUser.department,
            },
        })
        console.log(`  ✅ ${mplUser.employeeId} | ${mplUser.name} | ${mplUser.role} | Dept: ${mplUser.department || 'None'} | ID: ${user.id}`)
    }

    console.log('\n========================')
    console.log('✅ All MPL users seeded successfully!')
    console.log(`   - ${DEPARTMENT_ADMINS.length} Department Admins`)
    console.log(`   - ${MPL_USERS.length} MPL Users (MPL001-MPL030)`)
    console.log(`   - Default password: ${DEFAULT_PASSWORD}`)
    console.log('========================')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('❌ Seed failed:', e)
        await prisma.$disconnect()
        process.exit(1)
    })

import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
}

const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
})

const DEFAULT_PASSWORD = 'Moksh@123'

interface MPLUser {
    employeeId: string
    name: string
    email: string
    role: string
    department: string | null
}

const DEPARTMENT_ADMINS: MPLUser[] = [
    { employeeId: 'MPL-SA', name: 'Sales Admin', email: 'sales.admin@mokshpromotion.com', role: 'ADMIN', department: 'SALES' },
    { employeeId: 'MPL-OA', name: 'Operations Admin', email: 'ops.admin@mokshpromotion.com', role: 'ADMIN', department: 'OPERATIONS' },
    { employeeId: 'MPL-GA', name: 'Graphic Admin', email: 'graphic.admin@mokshpromotion.com', role: 'ADMIN', department: 'GRAPHIC' },
    { employeeId: 'MPL-AA', name: 'Account Admin', email: 'account.admin@mokshpromotion.com', role: 'ADMIN', department: 'ACCOUNT' },
    { employeeId: 'MPL-HA', name: 'HR Admin', email: 'hr.admin@mokshpromotion.com', role: 'ADMIN', department: 'HR' },
]

const MPL_USERS: MPLUser[] = [
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
    { employeeId: 'MPL011', name: 'Operations User 1', email: 'mpl011@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL012', name: 'Operations User 2', email: 'mpl012@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL013', name: 'Operations User 3', email: 'mpl013@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL014', name: 'Operations User 4', email: 'mpl014@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL015', name: 'Operations User 5', email: 'mpl015@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL016', name: 'Operations User 6', email: 'mpl016@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL017', name: 'Operations User 7', email: 'mpl017@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL018', name: 'Operations User 8', email: 'mpl018@mokshpromotion.com', role: 'OPERATIONS', department: 'OPERATIONS' },
    { employeeId: 'MPL019', name: 'Graphic User 1', email: 'mpl019@mokshpromotion.com', role: 'GRAPHIC', department: 'GRAPHIC' },
    { employeeId: 'MPL020', name: 'Graphic User 2', email: 'mpl020@mokshpromotion.com', role: 'GRAPHIC', department: 'GRAPHIC' },
    { employeeId: 'MPL021', name: 'Graphic User 3', email: 'mpl021@mokshpromotion.com', role: 'GRAPHIC', department: 'GRAPHIC' },
    { employeeId: 'MPL022', name: 'Graphic User 4', email: 'mpl022@mokshpromotion.com', role: 'GRAPHIC', department: 'GRAPHIC' },
    { employeeId: 'MPL023', name: 'Account User 1', email: 'mpl023@mokshpromotion.com', role: 'FINANCE', department: 'ACCOUNT' },
    { employeeId: 'MPL024', name: 'Account User 2', email: 'mpl024@mokshpromotion.com', role: 'FINANCE', department: 'ACCOUNT' },
    { employeeId: 'MPL025', name: 'HR User 1', email: 'mpl025@mokshpromotion.com', role: 'HR', department: 'HR' },
    { employeeId: 'MPL026', name: 'HR User 2', email: 'mpl026@mokshpromotion.com', role: 'HR', department: 'HR' },
    { employeeId: 'MPL027', name: 'HR Admin User 1', email: 'mpl027@mokshpromotion.com', role: 'ADMIN', department: 'HR' },
    { employeeId: 'MPL028', name: 'HR Admin User 2', email: 'mpl028@mokshpromotion.com', role: 'ADMIN', department: 'HR' },
    { employeeId: 'MPL029', name: 'User 29', email: 'mpl029@mokshpromotion.com', role: 'UNASSIGNED', department: null },
    { employeeId: 'MPL030', name: 'User 30', email: 'mpl030@mokshpromotion.com', role: 'UNASSIGNED', department: null },
]

async function main() {
    console.log('🚀 Seeding MPL Users...')
    console.log('========================')

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10)

    const allUsers = [...DEPARTMENT_ADMINS, ...MPL_USERS]

    for (const u of allUsers) {
        const query = `
            INSERT INTO "User" ("employeeId", "name", "email", "password", "role", "department", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT ("email") DO UPDATE SET
                "name" = EXCLUDED."name",
                "password" = EXCLUDED."password",
                "role" = EXCLUDED."role",
                "department" = EXCLUDED."department",
                "employeeId" = EXCLUDED."employeeId",
                "updatedAt" = NOW()
            RETURNING "id"
        `
        const result = await pool.query(query, [
            u.employeeId, u.name, u.email, hashedPassword, u.role, u.department
        ])
        console.log(`  ✅ ${u.employeeId} | ${u.name} | ${u.role} | Dept: ${u.department || 'None'} | ID: ${result.rows[0].id}`)
    }

    console.log('\n========================')
    console.log('✅ All MPL users seeded successfully!')
    console.log(`   - ${DEPARTMENT_ADMINS.length} Department Admins`)
    console.log(`   - ${MPL_USERS.length} MPL Users (MPL001-MPL030)`)
    console.log(`   - Default password: ${DEFAULT_PASSWORD}`)
    console.log('========================')

    await pool.end()
}

main().catch(async (e) => {
    console.error('❌ Seed failed:', e)
    await pool.end()
    process.exit(1)
})

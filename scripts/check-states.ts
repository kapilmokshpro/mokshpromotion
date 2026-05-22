import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
    console.log("Checking all states currently in the database...")
    const states = await db.inventoryHoarding.groupBy({
        by: ["state"],
        _count: {
            _all: true
        }
    })
    console.log("States and counts:")
    console.log(states)
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect())

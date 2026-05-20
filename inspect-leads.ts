import { db } from './lib/db'

async function run() {
    const leads = await db.lead.groupBy({
        by: ['status'],
        _count: {
            id: true
        }
    })
    console.log('Lead status counts:', leads)
}

run()

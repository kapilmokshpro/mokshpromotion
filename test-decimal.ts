import { Prisma } from '@prisma/client'

const d = new Prisma.Decimal(10.5)
console.log('d typeof:', typeof d)
console.log('d constructor name:', d.constructor?.name)
console.log('d hasOwnProperty d:', d.hasOwnProperty('d'))
console.log('d hasOwnProperty s:', d.hasOwnProperty('s'))
console.log('d hasOwnProperty e:', d.hasOwnProperty('e'))
console.log('"d" in d:', 'd' in d)
console.log('"s" in d:', 's' in d)
console.log('"e" in d:', 'e' in d)
console.log('typeof d.toNumber:', typeof (d as any).toNumber)

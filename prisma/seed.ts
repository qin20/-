import zhuwenTimeline from './zhuwen';
import { db } from '../app/utils/db.server';

async function main() {
  const admin = await db.user.create({
    data: {
      email: 'admin@prisma.io',
      name: '管理员',
      items: {
        create: {
          name: '朱温',
          descr: '朱温',
          timeline: {
            create: zhuwenTimeline,
          },
        },
      },
    },
  })
  console.log({ admin })
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
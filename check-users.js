const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        created_at: true
      },
      take: 5
    });

    console.log('Users in database:');
    console.log(JSON.stringify(users, null, 2));

    const count = await prisma.users.count();
    console.log(`\nTotal users: ${count}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
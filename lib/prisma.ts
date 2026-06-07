import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined');
  }

  // Parse credentials and host info from DATABASE_URL
  const url = new URL(connectionString);
  const host = url.hostname || 'localhost';
  const port = url.port ? parseInt(url.port) : 4000;
  const user = url.username || 'root';
  const password = url.password ? decodeURIComponent(url.password) : undefined;
  const database = url.pathname ? url.pathname.replace(/^\//, '') : undefined;

  const adapter = new PrismaMariaDb({
    host,
    port,
    user,
    password,
    database,
    connectionLimit: 10,
    allowPublicKeyRetrieval: true,
    ssl: true,
  });
  
  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}

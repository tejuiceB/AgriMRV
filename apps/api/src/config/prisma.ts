import { PrismaClient } from '@prisma/client';

// Use a single instance of PrismaClient across the application
const prisma = new PrismaClient();

export default prisma;

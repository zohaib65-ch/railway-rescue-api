'use strict';

require('dotenv').config();

const app = require('./src/app');
const { connectDB } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

(async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║       🚂  Railway Rescue API  🚂          ║');
    console.log('╠══════════════════════════════════════════╣');
    console.log(`║  Server   : http://localhost:${PORT}          ║`);
    console.log(`║  DB       : PostgreSQL + Prisma           ║`);
    console.log(`║  Env      : ${(process.env.NODE_ENV || 'development').padEnd(27)}║`);
    console.log('╚══════════════════════════════════════════╝');
  });
})();

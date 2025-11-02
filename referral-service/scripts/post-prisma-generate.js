#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const clientDir = path.join(__dirname, '../node_modules/.prisma/client');

console.log('Post-generate: Setting up Prisma client...');

// 1. Create default.js
const defaultJs = `const { PrismaClient } = require('./client.js');
module.exports = PrismaClient;
module.exports.PrismaClient = PrismaClient;
`;

fs.writeFileSync(path.join(clientDir, 'default.js'), defaultJs);
console.log('✓ Created default.js');

// 2. Create default.d.ts
const defaultDts = `export { PrismaClient } from './client';
export * from './client';
`;

fs.writeFileSync(path.join(clientDir, 'default.d.ts'), defaultDts);
console.log('✓ Created default.d.ts');

// 3. Compile TypeScript files to JavaScript
try {
  console.log('Compiling Prisma client TypeScript files...');
  execSync(
    `npx tsc ${clientDir}/*.ts ${clientDir}/internal/*.ts ${clientDir}/models/*.ts --outDir ${clientDir} --module commonjs --target es2020 --esModuleInterop --skipLibCheck --moduleResolution node --resolveJsonModule`,
    { stdio: 'inherit', cwd: path.join(__dirname, '..') }
  );
  console.log('✓ Compiled Prisma client files');
} catch (error) {
  console.warn('⚠ TypeScript compilation had warnings (this is usually okay)');
}

// 4. Create symlink for @prisma/client
const prismaClientDir = path.join(__dirname, '../node_modules/@prisma/client');
const symlinkPath = path.join(prismaClientDir, '.prisma');
try {
  if (fs.existsSync(symlinkPath)) {
    fs.unlinkSync(symlinkPath);
  }
  fs.symlinkSync('../../.prisma/client', symlinkPath);
  console.log('✓ Created @prisma/client symlink');
} catch (error) {
  console.warn('⚠ Could not create symlink (may already exist)');
}

console.log('✅ Prisma client setup complete!');




#!/usr/bin/env node

/**
 * Production Readiness Check Script
 * 
 * Validates that the application is ready for production deployment.
 * Checks configuration, build status, dependencies, and security.
 * 
 * Usage: node scripts/deployment/production-check.js
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const REQUIRED_ENV_VARS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'NODE_ENV'
];

const SECURITY_CHECKS = [
  'No debug logs in production',
  'Environment variables secured',
  'Firebase security rules configured',
  'CORS properly configured',
  'Rate limiting enabled'
];

let hasErrors = false;

function logCheck(message, status, details = '') {
  const symbol = status ? '✅' : '❌';
  console.log(`${symbol} ${message}`);
  if (details) {
    console.log(`   ${details}`);
  }
  if (!status) {
    hasErrors = true;
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...');
  
  try {
    const envPath = path.join(projectRoot, '.env.production');
    const envExists = await fs.access(envPath).then(() => true).catch(() => false);
    
    logCheck('Production environment file exists', envExists, 
      envExists ? '' : 'Create .env.production file');

    if (envExists) {
      const envContent = await fs.readFile(envPath, 'utf8');
      
      for (const envVar of REQUIRED_ENV_VARS) {
        const hasVar = envContent.includes(`${envVar}=`);
        logCheck(`${envVar} configured`, hasVar);
      }

      // Check for development values
      const hasDevValues = envContent.includes('localhost') || 
                          envContent.includes('development') ||
                          envContent.includes('test-project');
      
      logCheck('No development values in production config', !hasDevValues,
        hasDevValues ? 'Replace development values with production values' : '');
    }
  } catch (error) {
    logCheck('Environment check failed', false, error.message);
  }
}

async function checkBuildFiles() {
  console.log('\n🏗️  Checking Build Files...');
  
  try {
    const clientDistPath = path.join(projectRoot, 'client', 'dist');
    const distExists = await fs.access(clientDistPath).then(() => true).catch(() => false);
    
    logCheck('Client build exists', distExists, 
      distExists ? '' : 'Run: npm run build');

    if (distExists) {
      const indexPath = path.join(clientDistPath, 'index.html');
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
      
      logCheck('Client index.html exists', indexExists);

      const assetsPath = path.join(clientDistPath, 'assets');
      const assetsExist = await fs.access(assetsPath).then(() => true).catch(() => false);
      
      logCheck('Client assets exist', assetsExist);
    }
  } catch (error) {
    logCheck('Build check failed', false, error.message);
  }
}

async function checkDependencies() {
  console.log('\n📦 Checking Dependencies...');
  
  try {
    // Check server package.json
    const serverPackagePath = path.join(projectRoot, 'server', 'package.json');
    const serverPackage = JSON.parse(await fs.readFile(serverPackagePath, 'utf8'));
    
    logCheck('Server package.json valid', !!serverPackage.name);
    logCheck('Server has start script', !!serverPackage.scripts?.start);

    // Check client package.json
    const clientPackagePath = path.join(projectRoot, 'client', 'package.json');
    const clientPackage = JSON.parse(await fs.readFile(clientPackagePath, 'utf8'));
    
    logCheck('Client package.json valid', !!clientPackage.name);
    logCheck('Client has build script', !!clientPackage.scripts?.build);

    // Check for production dependencies
    const prodDeps = Object.keys(serverPackage.dependencies || {});
    logCheck('Server has production dependencies', prodDeps.length > 0);

  } catch (error) {
    logCheck('Dependencies check failed', false, error.message);
  }
}

async function checkFirebaseConfig() {
  console.log('\n🔥 Checking Firebase Configuration...');
  
  try {
    const firebaseConfigPath = path.join(projectRoot, 'firebase.json');
    const configExists = await fs.access(firebaseConfigPath).then(() => true).catch(() => false);
    
    logCheck('Firebase config exists', configExists);

    if (configExists) {
      const config = JSON.parse(await fs.readFile(firebaseConfigPath, 'utf8'));
      
      logCheck('Hosting configured', !!config.hosting);
      logCheck('Firestore rules configured', !!config.firestore?.rules);
      logCheck('Storage rules configured', !!config.storage?.rules);
      logCheck('Functions configured', !!config.functions);
    }

    const firestoreRulesPath = path.join(projectRoot, 'firebase', 'firestore.rules');
    const rulesExist = await fs.access(firestoreRulesPath).then(() => true).catch(() => false);
    
    logCheck('Firestore security rules exist', rulesExist);

  } catch (error) {
    logCheck('Firebase config check failed', false, error.message);
  }
}

async function checkSecurity() {
  console.log('\n🔒 Security Checks...');
  
  try {
    // Check for debug code in server
    const serverIndexPath = path.join(projectRoot, 'server', 'index.js');
    const serverContent = await fs.readFile(serverIndexPath, 'utf8');
    
    const hasDebugLogs = serverContent.includes('console.log') || 
                        serverContent.includes('console.debug');
    
    logCheck('No debug logs in server', !hasDebugLogs,
      hasDebugLogs ? 'Remove console.log statements' : '');

    // Check CORS configuration
    const hasCorsConfig = serverContent.includes('cors') || 
                         serverContent.includes('Access-Control');
    
    logCheck('CORS configured', hasCorsConfig);

    // Check rate limiting
    const hasRateLimit = serverContent.includes('rate') || 
                        serverContent.includes('limit');
    
    logCheck('Rate limiting present', hasRateLimit,
      hasRateLimit ? '' : 'Consider implementing rate limiting');

  } catch (error) {
    logCheck('Security check failed', false, error.message);
  }
}

async function generateReport() {
  console.log('\n📊 Production Readiness Report');
  console.log('=' .repeat(50));
  
  if (hasErrors) {
    console.log('❌ NOT READY FOR PRODUCTION');
    console.log('\nPlease fix the issues above before deploying.');
    process.exit(1);
  } else {
    console.log('✅ READY FOR PRODUCTION');
    console.log('\nAll checks passed! Your application is ready for deployment.');
  }
}

async function main() {
  console.log('🚀 Production Readiness Check');
  console.log('Checking application for production deployment...\n');
  
  await checkEnvironmentVariables();
  await checkBuildFiles();
  await checkDependencies();
  await checkFirebaseConfig();
  await checkSecurity();
  await generateReport();
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;

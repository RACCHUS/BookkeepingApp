#!/usr/bin/env node

/**
 * Development Environment Setup Script
 * 
 * Sets up the development environment with all necessary dependencies,
 * configuration files, and development tools.
 * 
 * Usage: node scripts/utilities/setup-dev-env.js [--full]
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const isFullSetup = process.argv.includes('--full');
const isSkipInstall = process.argv.includes('--skip-install');

function log(message, emoji = '📝') {
  console.log(`${emoji} ${message}`);
}

function logError(message) {
  console.error(`❌ ${message}`);
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

async function checkPrerequisites() {
  log('Checking prerequisites...', '🔍');
  
  try {
    // Check Node.js version
    const { stdout: nodeVersion } = await execAsync('node --version');
    const majorVersion = parseInt(nodeVersion.match(/v(\d+)/)[1]);
    
    if (majorVersion >= 18) {
      logSuccess(`Node.js ${nodeVersion.trim()} detected`);
    } else {
      logError(`Node.js 18+ required, found ${nodeVersion.trim()}`);
      return false;
    }

    // Check npm
    const { stdout: npmVersion } = await execAsync('npm --version');
    logSuccess(`npm ${npmVersion.trim()} detected`);

    // Check Git
    try {
      const { stdout: gitVersion } = await execAsync('git --version');
      logSuccess(`Git detected: ${gitVersion.trim()}`);
    } catch {
      log('Git not found - version control features may be limited', '⚠️');
    }

    return true;
  } catch (error) {
    logError(`Prerequisites check failed: ${error.message}`);
    return false;
  }
}

async function setupEnvironmentFiles() {
  log('Setting up environment files...', '🌍');
  
  const envFiles = [
    {
      source: '.env.example',
      target: '.env',
      description: 'Development environment variables'
    },
    {
      source: '.env.example',
      target: '.env.local',
      description: 'Local development overrides'
    }
  ];

  for (const { source, target, description } of envFiles) {
    const sourcePath = path.join(projectRoot, source);
    const targetPath = path.join(projectRoot, target);
    
    try {
      const sourceExists = await fs.access(sourcePath).then(() => true).catch(() => false);
      const targetExists = await fs.access(targetPath).then(() => true).catch(() => false);
      
      if (sourceExists && !targetExists) {
        await fs.copyFile(sourcePath, targetPath);
        logSuccess(`Created ${target} from ${source}`);
        log(`Please configure ${target} with your values`, '📝');
      } else if (targetExists) {
        log(`${target} already exists, skipping`, 'ℹ️');
      } else {
        log(`${source} not found, please create ${target} manually`, '⚠️');
      }
    } catch (error) {
      logError(`Failed to setup ${target}: ${error.message}`);
    }
  }
}

async function installDependencies() {
  if (isSkipInstall) {
    log('Skipping dependency installation', 'ℹ️');
    return;
  }

  log('Installing dependencies...', '📦');
  
  try {
    log('Installing root dependencies...');
    await execAsync('npm install', { cwd: projectRoot });
    logSuccess('Root dependencies installed');

    log('Installing server dependencies...');
    await execAsync('npm install', { cwd: path.join(projectRoot, 'server') });
    logSuccess('Server dependencies installed');

    log('Installing client dependencies...');
    await execAsync('npm install', { cwd: path.join(projectRoot, 'client') });
    logSuccess('Client dependencies installed');

  } catch (error) {
    logError(`Dependency installation failed: ${error.message}`);
    throw error;
  }
}

async function setupFirebaseConfig() {
  log('Setting up Firebase configuration...', '🔥');
  
  try {
    const firebaseConfigPath = path.join(projectRoot, 'firebase.json');
    const configExists = await fs.access(firebaseConfigPath).then(() => true).catch(() => false);
    
    if (configExists) {
      logSuccess('Firebase configuration already exists');
    } else {
      log('Firebase configuration not found', '⚠️');
      log('Please run: firebase init', '📝');
    }

    // Check for Firebase service account
    const serviceAccountPath = path.join(projectRoot, 'server', 'config', 'serviceAccountKey.json');
    const serviceAccountExists = await fs.access(serviceAccountPath).then(() => true).catch(() => false);
    
    if (!serviceAccountExists) {
      log('Firebase service account key not found', '⚠️');
      log('Please add your service account key to server/config/serviceAccountKey.json', '📝');
    } else {
      logSuccess('Firebase service account key found');
    }

  } catch (error) {
    logError(`Firebase setup failed: ${error.message}`);
  }
}

async function setupDevelopmentTools() {
  if (!isFullSetup) {
    log('Skipping development tools setup (use --full for complete setup)', 'ℹ️');
    return;
  }

  log('Setting up development tools...', '🛠️');
  
  try {
    // Setup VS Code settings if not present
    const vscodePath = path.join(projectRoot, '.vscode');
    const vscodeExists = await fs.access(vscodePath).then(() => true).catch(() => false);
    
    if (vscodeExists) {
      logSuccess('VS Code configuration found');
    } else {
      log('VS Code configuration not found - workspace features may be limited', '⚠️');
    }

    // Check for Prettier config
    const prettierConfigPath = path.join(projectRoot, '.prettierrc');
    const prettierExists = await fs.access(prettierConfigPath).then(() => true).catch(() => false);
    
    if (!prettierExists) {
      const prettierConfig = {
        semi: true,
        trailingComma: 'es5',
        singleQuote: true,
        printWidth: 80,
        tabWidth: 2
      };
      
      await fs.writeFile(prettierConfigPath, JSON.stringify(prettierConfig, null, 2));
      logSuccess('Created Prettier configuration');
    }

    // Check for ESLint config
    const eslintConfigPath = path.join(projectRoot, '.eslintrc.js');
    const eslintExists = await fs.access(eslintConfigPath).then(() => true).catch(() => false);
    
    if (!eslintExists) {
      log('ESLint configuration not found - consider adding linting rules', '⚠️');
    }

  } catch (error) {
    logError(`Development tools setup failed: ${error.message}`);
  }
}

async function createDirectoryStructure() {
  log('Creating directory structure...', '📁');
  
  const directories = [
    'server/uploads',
    'server/logs',
    'reports/generated/pdf',
    'reports/generated/csv',
    'reports/generated/temp',
    'client/src/assets/images',
    'docs/api',
    'test/data'
  ];

  for (const dir of directories) {
    const dirPath = path.join(projectRoot, dir);
    
    try {
      await fs.mkdir(dirPath, { recursive: true });
      
      // Create .gitkeep for empty directories
      const gitkeepPath = path.join(dirPath, '.gitkeep');
      const files = await fs.readdir(dirPath);
      
      if (files.length === 0) {
        await fs.writeFile(gitkeepPath, '');
        log(`Created directory: ${dir}`, '📂');
      }
    } catch (error) {
      logError(`Failed to create directory ${dir}: ${error.message}`);
    }
  }
}

async function setupTestData() {
  if (!isFullSetup) {
    return;
  }

  log('Setting up test data...', '🧪');
  
  try {
    const testDataPath = path.join(projectRoot, 'test', 'data');
    
    // Create sample CSV
    const sampleCSV = `Date,Description,Amount,Category
2024-01-15,Office Supplies,89.47,Office Supplies
2024-01-16,Internet Service,79.99,Utilities
2024-01-18,Client Payment,2500.00,Service Revenue`;
    
    await fs.writeFile(path.join(testDataPath, 'sample-transactions.csv'), sampleCSV);
    
    logSuccess('Test data created');
  } catch (error) {
    logError(`Test data setup failed: ${error.message}`);
  }
}

async function validateSetup() {
  log('Validating setup...', '🔍');
  
  const checks = [
    {
      name: 'Environment file exists',
      check: () => fs.access(path.join(projectRoot, '.env')).then(() => true).catch(() => false)
    },
    {
      name: 'Server dependencies installed',
      check: () => fs.access(path.join(projectRoot, 'server', 'node_modules')).then(() => true).catch(() => false)
    },
    {
      name: 'Client dependencies installed',
      check: () => fs.access(path.join(projectRoot, 'client', 'node_modules')).then(() => true).catch(() => false)
    },
    {
      name: 'Firebase config exists',
      check: () => fs.access(path.join(projectRoot, 'firebase.json')).then(() => true).catch(() => false)
    }
  ];

  let allPassed = true;
  
  for (const { name, check } of checks) {
    const passed = await check();
    if (passed) {
      logSuccess(name);
    } else {
      logError(name);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function main() {
  console.log('🚀 Setting up development environment...\n');
  
  try {
    const prerequisitesPassed = await checkPrerequisites();
    if (!prerequisitesPassed) {
      process.exit(1);
    }

    await setupEnvironmentFiles();
    await installDependencies();
    await setupFirebaseConfig();
    await setupDevelopmentTools();
    await createDirectoryStructure();
    await setupTestData();
    
    console.log('\n🔍 Final validation...');
    const validationPassed = await validateSetup();
    
    console.log('\n' + '='.repeat(50));
    
    if (validationPassed) {
      logSuccess('Development environment setup completed!');
      console.log('\n📝 Next steps:');
      console.log('   1. Configure your .env file with Firebase credentials');
      console.log('   2. Run: npm run dev (to start development servers)');
      console.log('   3. Open: http://localhost:5173 (client) and http://localhost:3000 (server)');
    } else {
      logError('Setup completed with some issues. Please review the errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;

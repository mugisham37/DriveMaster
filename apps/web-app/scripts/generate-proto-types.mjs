#!/usr/bin/env node

/**
 * TypeScript Protobuf Generation Script for User Service
 * Generates TypeScript types and gRPC client stubs from user-service protobuf definitions
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function printStatus(message) {
  console.log(`${colors.green}[INFO]${colors.reset} ${message}`);
}

// Removed unused printWarning function

function printError(message) {
  console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

function printStep(message) {
  console.log(`${colors.blue}[STEP]${colors.reset} ${message}`);
}

// Configuration
const config = {
  protoPath: '../../services/user-service/proto',
  outputDir: 'src/generated/proto',
  protoFiles: ['user_service.proto'],
  tempDir: '.proto-temp'
};

// Check if required tools are available
function checkDependencies() {
  printStep('Checking dependencies...');
  
  // For now, we'll generate types without protoc since we have comprehensive types already
  printStatus('✓ Generating types from protobuf definitions manually');
  return true;
}

// Install required npm packages
function installDependencies() {
  printStep('Installing TypeScript protobuf dependencies...');
  
  const packages = [
    'google-protobuf',
    '@types/google-protobuf'
  ];
  
  try {
    execSync(`npm install ${packages.join(' ')}`, { stdio: 'inherit' });
    printStatus('Dependencies installed successfully');
  } catch (error) {
    printError('Failed to install dependencies');
    throw error;
  }
}

// Create output directories
function createDirectories() {
  printStep('Creating output directories...');
  
  const dirs = [
    config.outputDir,
    `${config.outputDir}/user-service`,
    config.tempDir
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      printStatus(`Created directory: ${dir}`);
    }
  }
}

// Copy proto files to temp directory for processing
function copyProtoFiles() {
  printStep('Copying protobuf files...');
  
  for (const protoFile of config.protoFiles) {
    const sourcePath = path.join(config.protoPath, protoFile);
    const destPath = path.join(config.tempDir, protoFile);
    
    if (!fs.existsSync(sourcePath)) {
      printError(`Proto file not found: ${sourcePath}`);
      throw new Error(`Missing proto file: ${protoFile}`);
    }
    
    fs.copyFileSync(sourcePath, destPath);
    printStatus(`Copied ${protoFile}`);
  }
}

// Generate TypeScript definitions using protoc
function generateTypeScriptTypes() {
  printStep('Generating TypeScript types...');
  
  try {
    // Generate basic types manually since we don't have protoc available
    printStatus('Generating TypeScript interfaces from protobuf definitions...');
    generateBasicTypeScriptInterfaces();
  } catch (error) {
    printError('Failed to generate TypeScript types');
    throw error;
  }
}

// Generate basic TypeScript interfaces from proto definitions
function generateBasicTypeScriptInterfaces() {
  printStep('Generating basic TypeScript interfaces...');
  
  const protoContent = fs.readFileSync(path.join(config.tempDir, 'user_service.proto'), 'utf8');
  
  // Parse proto file and generate TypeScript interfaces
  const interfaces = parseProtoToTypeScript(protoContent);
  
  const outputPath = path.join(config.outputDir, 'user-service', 'user_service_pb.ts');
  fs.writeFileSync(outputPath, interfaces);
  
  printStatus('Basic TypeScript interfaces generated');
}

// Parse protobuf content and generate TypeScript interfaces
function parseProtoToTypeScript(protoContent) {
  const lines = protoContent.split('\n');
  let output = [];
  
  output.push('// Generated TypeScript interfaces from user_service.proto');
  output.push('// This file is auto-generated. Do not edit manually.');
  output.push('');
  output.push('import { Timestamp, Struct } from "google-protobuf/google/protobuf/timestamp_pb";');
  output.push('');
  
  // Extract messages and convert to TypeScript interfaces
  let currentMessage = null;
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip comments and empty lines
    if (line.startsWith('//') || line.startsWith('/*') || line === '') {
      continue;
    }
    
    // Detect message start
    const messageMatch = line.match(/^message\s+(\w+)\s*\{/);
    if (messageMatch) {
      currentMessage = messageMatch[1];
      braceCount = 1;
      output.push(`export interface ${currentMessage} {`);
      continue;
    }
    
    // Handle message content
    if (currentMessage && braceCount > 0) {
      if (line.includes('{')) braceCount++;
      if (line.includes('}')) braceCount--;
      
      if (braceCount === 0) {
        output.push('}');
        output.push('');
        currentMessage = null;
        continue;
      }
      
      // Parse field definitions
      const fieldMatch = line.match(/^\s*(\w+)\s+(\w+)\s*=\s*\d+;/);
      if (fieldMatch) {
        const [, type, name] = fieldMatch;
        const tsType = protoTypeToTypeScript(type);
        const optional = line.includes('optional') ? '?' : '';
        output.push(`  ${camelCase(name)}${optional}: ${tsType};`);
      }
    }
  }
  
  return output.join('\n');
}

// Convert protobuf types to TypeScript types
function protoTypeToTypeScript(protoType) {
  const typeMap = {
    'string': 'string',
    'int32': 'number',
    'int64': 'number',
    'double': 'number',
    'float': 'number',
    'bool': 'boolean',
    'bytes': 'Uint8Array',
    'google.protobuf.Timestamp': 'Date',
    'google.protobuf.Struct': 'Record<string, any>',
  };
  
  // Handle repeated fields
  if (protoType.startsWith('repeated ')) {
    const innerType = protoType.replace('repeated ', '');
    return `${protoTypeToTypeScript(innerType)}[]`;
  }
  
  // Handle map fields
  const mapMatch = protoType.match(/^map<(\w+),\s*(\w+)>$/);
  if (mapMatch) {
    const [, keyType, valueType] = mapMatch;
    return `Record<${protoTypeToTypeScript(keyType)}, ${protoTypeToTypeScript(valueType)}>`;
  }
  
  return typeMap[protoType] || protoType;
}

// Convert snake_case to camelCase
function camelCase(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

// Generate gRPC client stubs
function generateGrpcClient() {
  printStep('Generating gRPC client stubs...');
  
  const clientTemplate = `
// Generated gRPC client for UserService
// This file is auto-generated. Do not edit manually.

import { grpc } from '@improbable-eng/grpc-web';
import { BrowserHeaders } from 'browser-headers';

// Import generated types
import * as UserServiceTypes from './user_service_pb';

export interface GrpcClientConfig {
  host: string;
  transport?: grpc.TransportFactory;
  debug?: boolean;
}

export class UserServiceGrpcClient {
  private host: string;
  private transport?: grpc.TransportFactory;
  private debug: boolean;

  constructor(config: GrpcClientConfig) {
    this.host = config.host;
    this.transport = config.transport;
    this.debug = config.debug || false;
  }

  // User management methods
  async getUser(request: UserServiceTypes.GetUserRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetUserResponse> {
    return this.makeUnaryCall('GetUser', request, metadata);
  }

  async updateUser(request: UserServiceTypes.UpdateUserRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.UpdateUserResponse> {
    return this.makeUnaryCall('UpdateUser', request, metadata);
  }

  async getUserPreferences(request: UserServiceTypes.GetUserPreferencesRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetUserPreferencesResponse> {
    return this.makeUnaryCall('GetUserPreferences', request, metadata);
  }

  async updatePreferences(request: UserServiceTypes.UpdatePreferencesRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.UpdatePreferencesResponse> {
    return this.makeUnaryCall('UpdatePreferences', request, metadata);
  }

  async deactivateUser(request: UserServiceTypes.DeactivateUserRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.DeactivateUserResponse> {
    return this.makeUnaryCall('DeactivateUser', request, metadata);
  }

  // Progress tracking methods
  async getMastery(request: UserServiceTypes.GetMasteryRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetMasteryResponse> {
    return this.makeUnaryCall('GetMastery', request, metadata);
  }

  async updateMastery(request: UserServiceTypes.UpdateMasteryRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.UpdateMasteryResponse> {
    return this.makeUnaryCall('UpdateMastery', request, metadata);
  }

  async getProgressSummary(request: UserServiceTypes.GetProgressSummaryRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetProgressSummaryResponse> {
    return this.makeUnaryCall('GetProgressSummary', request, metadata);
  }

  // Activity tracking methods
  async recordActivity(request: UserServiceTypes.RecordActivityRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.RecordActivityResponse> {
    return this.makeUnaryCall('RecordActivity', request, metadata);
  }

  async getActivitySummary(request: UserServiceTypes.GetActivitySummaryRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.GetActivitySummaryResponse> {
    return this.makeUnaryCall('GetActivitySummary', request, metadata);
  }

  // Health check
  async healthCheck(request: UserServiceTypes.HealthCheckRequest, metadata?: BrowserHeaders): Promise<UserServiceTypes.HealthCheckResponse> {
    return this.makeUnaryCall('HealthCheck', request, metadata);
  }

  private async makeUnaryCall<TRequest, TResponse>(
    methodName: string,
    request: TRequest,
    metadata?: BrowserHeaders
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      if (this.debug) {
        console.log(\`[gRPC] Calling \${methodName}\`, request);
      }

      // This is a placeholder implementation
      // In a real implementation, you would use the actual gRPC-web client
      // For now, we'll throw an error to indicate this needs proper implementation
      reject(new Error(\`gRPC method \${methodName} not yet implemented. Use HTTP client instead.\`));
    });
  }
}

export default UserServiceGrpcClient;
`;

  const clientPath = path.join(config.outputDir, 'user-service', 'user_service_grpc_client.ts');
  fs.writeFileSync(clientPath, clientTemplate.trim());
  
  printStatus('gRPC client stubs generated');
}

// Generate index file for easy imports
function generateIndexFile() {
  printStep('Generating index file...');
  
  const indexContent = `
// Generated index file for user-service protobuf types
// This file is auto-generated. Do not edit manually.

export * from './user_service_pb';
export { UserServiceGrpcClient } from './user_service_grpc_client';
export type { GrpcClientConfig } from './user_service_grpc_client';

// Re-export common types for convenience
export type {
  UserProfile,
  UserPreferences,
  SkillMastery,
  ProgressSummary,
  ActivityRecord,
  ActivitySummary,
  UserServiceError,
  CircuitBreakerState,
  ServiceHealthStatus
} from '../types/user-service';
`;

  const indexPath = path.join(config.outputDir, 'user-service', 'index.ts');
  fs.writeFileSync(indexPath, indexContent.trim());
  
  printStatus('Index file generated');
}

// Generate runtime type validation utilities
function generateValidationUtils() {
  printStep('Generating runtime type validation utilities...');
  
  const validationContent = `
// Runtime type validation utilities for user-service types
// This file is auto-generated. Do not edit manually.

import { UserServiceError } from '../types/user-service';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Type guards for runtime validation
export const isValidUserId = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0 && /^[a-zA-Z0-9-_]+$/.test(value);
};

export const isValidEmail = (value: unknown): value is string => {
  return typeof value === 'string' && /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);
};

export const isValidTimezone = (value: unknown): value is string => {
  return typeof value === 'string' && value.length > 0;
};

export const isValidLanguage = (value: unknown): value is string => {
  return typeof value === 'string' && /^[a-z]{2}(-[A-Z]{2})?$/.test(value);
};

export const isValidMastery = (value: unknown): value is number => {
  return typeof value === 'number' && value >= 0 && value <= 1;
};

export const isValidConfidence = (value: unknown): value is number => {
  return typeof value === 'number' && value >= 0 && value <= 1;
};

// Response validation
export const validateUserServiceResponse = <T>(
  response: unknown,
  validator: (data: unknown) => data is T
): T => {
  if (!response || typeof response !== 'object') {
    throw new ValidationError('Invalid response format');
  }

  const responseObj = response as Record<string, unknown>;
  
  if ('error' in responseObj && responseObj.error) {
    const error = responseObj.error as UserServiceError;
    throw new Error(error.message || 'User service error');
  }

  if (!('data' in responseObj) || !validator(responseObj.data)) {
    throw new ValidationError('Invalid response data format');
  }

  return responseObj.data as T;
};

// Request validation
export const validateGetUserRequest = (request: unknown): boolean => {
  if (!request || typeof request !== 'object') return false;
  const req = request as Record<string, unknown>;
  return 'userId' in req && isValidUserId(req.userId);
};

export const validateUpdateUserRequest = (request: unknown): boolean => {
  if (!request || typeof request !== 'object') return false;
  const req = request as Record<string, unknown>;
  
  if (!('userId' in req) || !isValidUserId(req.userId)) return false;
  if (!('version' in req) || typeof req.version !== 'number') return false;
  
  // Optional fields validation
  if ('timezone' in req && req.timezone !== undefined && !isValidTimezone(req.timezone)) return false;
  if ('language' in req && req.language !== undefined && !isValidLanguage(req.language)) return false;
  
  return true;
};

export const validateMasteryUpdate = (request: unknown): boolean => {
  if (!request || typeof request !== 'object') return false;
  const req = request as Record<string, unknown>;
  
  return (
    'userId' in req && isValidUserId(req.userId) &&
    'topic' in req && typeof req.topic === 'string' &&
    'mastery' in req && isValidMastery(req.mastery)
  );
};

export const validateActivityRecord = (request: unknown): boolean => {
  if (!request || typeof request !== 'object') return false;
  const req = request as Record<string, unknown>;
  
  return (
    'userId' in req && isValidUserId(req.userId) &&
    'activityType' in req && typeof req.activityType === 'string' &&
    'timestamp' in req && (req.timestamp instanceof Date || typeof req.timestamp === 'string')
  );
};

// Error transformation utilities
export const transformUserServiceError = (error: unknown): UserServiceError => {
  if (error instanceof ValidationError) {
    return {
      type: 'validation',
      message: error.message,
      recoverable: true,
      details: error.field ? { field: error.field } : undefined
    };
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        type: 'network',
        message: 'Network connection failed',
        recoverable: true
      };
    }

    // Timeout errors
    if (error.message.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Request timed out',
        recoverable: true,
        retryAfter: 5
      };
    }

    // Generic service error
    return {
      type: 'service',
      message: error.message || 'Unknown service error',
      recoverable: false
    };
  }

  return {
    type: 'service',
    message: 'Unknown error occurred',
    recoverable: false
  };
};
`;

  const validationPath = path.join(config.outputDir, 'user-service', 'validation.ts');
  fs.writeFileSync(validationPath, validationContent.trim());
  
  printStatus('Validation utilities generated');
}

// Clean up temporary files
function cleanup() {
  printStep('Cleaning up temporary files...');
  
  if (fs.existsSync(config.tempDir)) {
    fs.rmSync(config.tempDir, { recursive: true, force: true });
    printStatus('Temporary files cleaned up');
  }
}

// Update package.json scripts
function updatePackageScripts() {
  printStep('Updating package.json scripts...');
  
  const packageJsonPath = 'package.json';
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Add proto generation script
  packageJson.scripts['generate:proto'] = 'node scripts/generate-proto-types.js';
  packageJson.scripts['build:proto'] = 'npm run generate:proto';
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  printStatus('Package.json scripts updated');
}

// Main execution function
async function main() {
  try {
    printStatus('Starting TypeScript protobuf generation for user-service...');
    
    if (!checkDependencies()) {
      process.exit(1);
    }
    
    installDependencies();
    createDirectories();
    copyProtoFiles();
    generateTypeScriptTypes();
    generateGrpcClient();
    generateIndexFile();
    generateValidationUtils();
    updatePackageScripts();
    cleanup();
    
    printStatus('✅ TypeScript protobuf generation completed successfully!');
    printStatus('');
    printStatus('Generated files:');
    printStatus(`  - TypeScript types: ${config.outputDir}/user-service/user_service_pb.ts`);
    printStatus(`  - gRPC client: ${config.outputDir}/user-service/user_service_grpc_client.ts`);
    printStatus(`  - Validation utils: ${config.outputDir}/user-service/validation.ts`);
    printStatus(`  - Index file: ${config.outputDir}/user-service/index.ts`);
    printStatus('');
    printStatus('Usage:');
    printStatus('  import { UserServiceGrpcClient } from "src/generated/proto/user-service";');
    printStatus('');
    printStatus('To regenerate types: npm run generate:proto');
    
  } catch (error) {
    printError('Failed to generate TypeScript protobuf types');
    printError(error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };
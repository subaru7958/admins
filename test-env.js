import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Testing .env file...');
console.log('📁 Current directory:', __dirname);

// Load .env file
dotenv.config();

console.log('📡 Environment variables:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Found' : 'Missing');

if (process.env.MONGODB_URI) {
  console.log('✅ MONGODB_URI is loaded correctly');
} else {
  console.log('❌ MONGODB_URI is missing');
} 
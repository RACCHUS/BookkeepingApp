// Test file to verify api exports
import { apiClient } from './client/src/services/api.js';

console.log('apiClient:', apiClient);
console.log('pdf methods:', apiClient.pdf);
console.log('companies methods:', apiClient.companies);

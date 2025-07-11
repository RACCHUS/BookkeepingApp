# Additional Copilot Instructions: ESM Test Scripts

## Node.js ESM Test Script Guidance
- If your project uses `"type": "module"` in `package.json`, all scripts are treated as ES modules.
- **Do not use** `if (require.main === module) { ... }` in `.js` test files. This is only valid for CommonJS.
- **Instead,** just call your main function directly at the end of the file:
  ```js
  debugDeposits();
  ```
- For test files in `server/test/`, import from `../services/...` (not `../../services/...`).
- Always use ESM import/export syntax in all `.js` files unless you are using `.cjs` for CommonJS.

## Example
```js
import ChaseSectionExtractorNoLog from '../services/parsers/ChaseSectionExtractorNoLog.js';
// ...
debugDeposits();
```

## Why?
- Node.js ESM does not define `require` or `module.exports`.
- Using CommonJS checks in ESM files will cause runtime errors.

## When generating new test scripts:
- Always use direct function calls for entry points.
- Always use correct relative import paths from the test file location.
- Always use ESM syntax for imports/exports.

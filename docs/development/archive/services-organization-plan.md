# Services Folder Organization Plan

## Current Issues Identified
1. **Multiple Firebase Services**: cleanFirebaseService.js (main), firebaseService.js (legacy), hybridFirebaseService.js, simpleHybridService.js, mockFirebaseService.js
2. **Multiple PDF Parsers**: chasePDFParser.js (main), improvedChasePDFParser.js, safeChasePDFParser.js, pdfjsChasePDFParser.js
3. **Scattered PDF Logic**: parsers/ subdirectory with 9 specialized files
4. **Report Services**: Multiple report generators in reports/ subdirectory

## Consolidation Strategy

### Firebase Services
- **Keep**: `cleanFirebaseService.js` (currently used by all controllers)
- **Remove**: `firebaseService.js`, `hybridFirebaseService.js`, `simpleHybridService.js`, `mockFirebaseService.js`
- **Enhance**: Integrate utils toolkit, add professional patterns

### PDF Processing
- **Keep**: `chasePDFParser.js` (currently used by controllers)
- **Remove**: `improvedChasePDFParser.js`, `safeChasePDFParser.js`, `pdfjsChasePDFParser.js`
- **Organize**: Move parsers/ content into main parser or dedicated parsers module

### Service Organization
1. Core Services (business logic)
2. PDF Processing (consolidated)
3. Reports (organized)
4. Utilities (leverage new utils toolkit)

## Implementation Steps
1. Remove duplicate Firebase services
2. Remove duplicate PDF parsers  
3. Organize parsers subdirectory
4. Enhance remaining services with utils integration
5. Create services index.js for centralized exports
6. Update documentation

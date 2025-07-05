// Test script to verify date calculations
console.log('=== Testing Date Calculations ===\n');

function testYearDateCalculation(year) {
    // Old method (using local timezone)
    const oldStart = new Date(year, 0, 1).toISOString().split('T')[0];
    const oldEnd = new Date(year, 11, 31).toISOString().split('T')[0];
    
    // New method (using UTC)
    const newStart = new Date(Date.UTC(year, 0, 1)).toISOString().split('T')[0];
    const newEnd = new Date(Date.UTC(year, 11, 31)).toISOString().split('T')[0];
    
    console.log(`Year ${year}:`);
    console.log(`  Old method: ${oldStart} to ${oldEnd}`);
    console.log(`  New method: ${newStart} to ${newEnd}`);
    console.log(`  End dates match: ${oldEnd === newEnd ? 'YES' : 'NO'}`);
    console.log(`  Expected Dec 31: ${newEnd.endsWith('-12-31') ? 'YES' : 'NO'}`);
    console.log('');
    
    return {
        year,
        oldEnd,
        newEnd,
        isCorrect: newEnd.endsWith('-12-31')
    };
}

// Test multiple years including leap years
const testYears = [2020, 2021, 2022, 2023, 2024, 2025];
const results = testYears.map(testYearDateCalculation);

console.log('=== Summary ===');
console.log(`Timezone offset: ${new Date().getTimezoneOffset()} minutes`);
console.log(`All years ending in Dec 31: ${results.every(r => r.isCorrect) ? 'YES' : 'NO'}`);

if (!results.every(r => r.isCorrect)) {
    console.log('ISSUES FOUND:');
    results.filter(r => !r.isCorrect).forEach(r => {
        console.log(`  Year ${r.year}: ends in ${r.newEnd} instead of YYYY-12-31`);
    });
}

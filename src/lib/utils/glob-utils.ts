/**
 * Glob pattern matching utility for file filtering
 */

/**
 * Glob pattern matcher for simple patterns
 * Supports:
 * - * (any characters)
 * - ? (single character)
 * - [] (character sets)
 * - ** (directory recursion - treated as *)
 * - Case insensitive matching
 */
export const matchGlob = (pattern: string, text: string): boolean => {
	if (!pattern || pattern === '*') return true;

	// Normalize for case-insensitive matching
	const normalizedPattern = pattern.toLowerCase().trim();
	const normalizedText = text.toLowerCase();

	// Handle ** as * for filename matching
	const processedPattern = normalizedPattern.replace(/\*\*/g, '*');

	// Convert glob pattern to regex
	const regexPattern = processedPattern
		.replace(/[.+^${}()|\\]/g, '\\$&') // Escape special regex chars
		.replace(/\*/g, '.*') // * -> .*
		.replace(/\?/g, '.') // ? -> .
		.replace(/\[([^\]]*)\]/g, '[$1]'); // Keep character sets as-is

	const regex = new RegExp(`^${regexPattern}$`);
	return regex.test(normalizedText);
};

/**
 * Test if a filename matches a glob pattern
 * @param filename - filename to test (without path)
 * @param pattern - glob pattern to match against
 * @returns true if filename matches pattern
 */
export const matchFilename = (filename: string, pattern: string): boolean => {
	return matchGlob(pattern, filename);
};

/**
 * Filter files by glob pattern or partial match
 * @param filePaths - array of file paths
 * @param pattern - pattern to match against filenames (glob or partial)
 * @returns filtered array of file paths
 */
export const filterFilesByGlob = (filePaths: string[], pattern: string): string[] => {
	if (!pattern || pattern.trim() === '') return filePaths;

	const trimmedPattern = pattern.trim();

	return filePaths.filter((filePath) => {
		const filename = filePath.split('/').pop() || '';

		// If pattern contains glob characters, use glob matching
		if (
			trimmedPattern.includes('*') ||
			trimmedPattern.includes('?') ||
			trimmedPattern.includes('[')
		) {
			return matchFilename(filename, trimmedPattern);
		} else {
			// Otherwise use partial matching (case insensitive)
			return filename.toLowerCase().includes(trimmedPattern.toLowerCase());
		}
	});
};

/**
 * Test glob pattern matching examples
 */
export const testGlobPatterns = () => {
	const testCases = [
		{ pattern: '*.png', filename: 'image.png', expected: true },
		{ pattern: '*.PNG', filename: 'image.png', expected: true }, // Case insensitive
		{ pattern: 'test*', filename: 'test123.jpg', expected: true },
		{ pattern: 'test?.jpg', filename: 'testa.jpg', expected: true },
		{ pattern: 'test?.jpg', filename: 'test12.jpg', expected: false },
		{ pattern: '*[0-9]*', filename: 'image123.png', expected: true },
		{ pattern: 'DSC*', filename: 'DSC_0001.jpg', expected: true }
	];

	console.log('Glob pattern test results:');
	testCases.forEach(({ pattern, filename, expected }) => {
		const result = matchFilename(filename, pattern);
		const status = result === expected ? '✅' : '❌';
		console.log(`${status} "${filename}" matches "${pattern}": ${result} (expected: ${expected})`);
	});
};

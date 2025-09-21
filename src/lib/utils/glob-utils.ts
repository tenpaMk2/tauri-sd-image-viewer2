/**
 * Glob pattern matching utility for file filtering using picomatch
 */
import picomatch from 'picomatch';

/**
 * Test if a filename matches a glob pattern
 * @param filename - filename to test (without path)
 * @param pattern - glob pattern to match against
 * @returns true if filename matches pattern
 */
export const matchFilename = (filename: string, pattern: string): boolean => {
	const normalizedPattern = pattern.trim();
	const normalizedFilename = filename;

	const isMatch = picomatch(normalizedPattern, {
		nocase: true, // Case insensitive
		dot: true, // Match dotfiles
		nobrace: true, // Disable brace expansion for simplicity
		contains: true, // Enable substring matching
	});

	return isMatch(normalizedFilename);
};

/**
 * Filter files by glob pattern
 * @param filePaths - array of file paths
 * @param pattern - glob pattern to match against filenames
 * @returns filtered array of file paths
 */
export const filterFilesByGlob = (filePaths: string[], pattern: string): string[] => {
	if (!pattern || pattern.trim() === '') return filePaths;

	return filePaths.filter((filePath) => {
		const filename = filePath.split('/').pop() || '';
		return matchFilename(filename, pattern);
	});
};

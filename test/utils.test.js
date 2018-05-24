// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const assert = require( 'assert' );
const { describe, it } = require( 'mocha' );

// Project
const utils = require( '../src/utils' );

// --------------------------------------------------
// DEFINE TESTS
// --------------------------------------------------
describe( 'Utils', () => {
	describe( 'General', () => {
		it( 'should exist', () => {
			assert( !!utils );
		} );
	} );

	describe( 'normalizeDir()', () => {
		it( 'should be a function', () => {
			assert( typeof utils.normalizeDir === 'function' );
		} );

		it( 'should return non-string values "as is"', () => {
			let input = true;
			let output = utils.normalizeDir( input );

			assert( input === output );
		} );

		it( 'should not transform strings which include a trailing slash', () => {
			let input = 'path/to/dir/';
			let output = utils.normalizeDir( input );

			assert( input === output );
		} );

		it( 'should add a trailing slash if required', () => {
			let input = 'path/to/dir';
			let output = utils.normalizeDir( input );

			assert( `${input}/` === output );
		} );
	} );
} );

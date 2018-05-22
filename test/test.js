// IMPORT MODULES
// Vendor
const assert = require( 'assert' );
const { describe, it } = require( 'mocha' );

// Project
const GbDeploy = require( '../src' );

// DEFINE TESTS
describe( 'gb-node-deploy', () => {
	describe( 'Sanity', () => {
		it( 'should exist', () => {
			assert( true );
		} );
	} );

	describe( 'GbDeploy', () => {
		it( 'should exist', () => {
			assert( typeof GbDeploy === 'function' );
		} );

		it( 'should return a `GbDeploy` instance', () => {
			let myGbDeploy = new GbDeploy();

			assert( myGbDeploy instanceof GbDeploy );
		} );
	} );
} );

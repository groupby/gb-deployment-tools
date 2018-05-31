// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node

// Vendor
const merge = require( 'deepmerge' );
const semver = require( 'semver' );

// Project
const { MESSAGES } = require( './data' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------

// --------------------------------------------------
// CORE
// --------------------------------------------------
class GbRelease {
	constructor( {
 		releaseType = '',
		opts = {},
		data = {},
	} = {} ) {
		this.data = data || {};
		this.settings = merge( {}, opts ); // Since we're not merging in any defaults, this is a clone of `opts`.
		this.opts = opts;
		this.releaseType = releaseType;
	}

	run() {
		return new Promise( async ( resolve, reject ) => {
			try {
				// Increment semver-compliant release identifier to ensure release type is valid.
				if ( !semver.inc( '0.0.0', this.releaseType ) ) {
					throw new Error( `${MESSAGES.ERROR.INVALID_RELEASE_TYPE} <${this.releaseType}>` );
				}

				/// TODO: Do build.
				/// TODO: Bump version identifier, commit, and tag.
				/// TODO: Clone 'builds' repo, migrate files, and commit.
				/// TODO: ?
				/// TODO: Profit.
			} catch ( err ) {
				reject( err ) ;
			}
		} );
	}
}

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = GbRelease;

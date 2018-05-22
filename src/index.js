// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const merge = require( 'deepmerge' );

// Project

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const defaults = {
	build: 'all', /// TEMP
	environment: 'lower',
};

// --------------------------------------------------
// CORE
// --------------------------------------------------
class GbDeploy {
	constructor( { args = [], opts = {} } = {} ) {
		this.settings = merge( defaults, opts );
		this.opts = opts;
		this.args = args;

	}

	run() {
		if ( !this.build || !this.environment ) {
			return Promise.reject( '/// TODO: Reject msg' );
		}

		return new Promise( ( resolve, reject ) => {
			resolve( true );
		} );
	}
}


// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = GbDeploy;

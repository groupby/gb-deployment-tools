// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { fork } = require( 'child_process' );
const path = require( 'path' );

// Vendor
const del = require( 'del' );
const merge = require( 'deepmerge' );
const moment = require( 'moment' );
const semver = require( 'semver' );
const simpleGit = require( 'simple-git' );

// Project
const { KEYS, MESSAGES } = require( './data' );
const utils = require( './utils' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const git = simpleGit();

// --------------------------------------------------
// CORE
// --------------------------------------------------
class GbDeploy {
	constructor( {
		builds = [],
		opts = {},
		data = {},
	} = {} ) {
		this.data = data || {};
		this.settings = merge( {}, opts ); // Since we're not merging in any defaults, this is a clone of `opts`.
		this.opts = opts;
		this.builds = this.parseBuilds( builds );
	}

	/**
	 * Wrapper around validatation, clone, build, migrate, and deployment processes.
	 *
	 * @return {Promise}
	 */
	run() {
		return new Promise( async ( resolve, reject ) => {
			try {
				if ( !await this.validateRepo() ) {
					throw new Error( MESSAGES.ERROR.REPO_UNCLEAN );
				}

				if ( !this.validateData() ) {
					throw new Error( MESSAGES.ERROR.INVALID_DATA );
				}

				if ( !this.validateBuilds()) {
					throw new Error( `${MESSAGES.ERROR.INVALID_BUILDS}: <${Object.keys( this.getData( KEYS.GB_DEPLOY_BUILDS_KEY ) ).join( '|' )}>` );
				}

				if ( !this.validateEnvironment() ) {
					throw new Error( `${MESSAGES.ERROR.INVALID_ENV}: <${Object.keys( this.getData( KEYS.GB_DEPLOY_ENVS_KEY ) ).join( '|' )}>` );
				}

				// Perform additional validation for production deployments.
				if ( this.settings.environment === 'production' ) {
					// Prevent 'feature' branches from building/deploying to production.
					if ( !this.builds.every( build => semver.valid( build.version ) ) ) {
						throw new Error( MESSAGES.ERROR.MISSING_VERSION_PROD );
					}
				}

				await this.doClone();

				// If not deploying to production, compile any builds which do not include a valid version identifier.
				if ( !this.builds.every( build => semver.valid( build.version ) ) ) {
					await this.doBuild();
					await this.doMigrate( this.builds );
				}

				await this.doDeploy();
				await this.doCleanup();

				resolve( true ); /// TODO: Determine 'success' message.
				return;
			} catch ( err ) {
				/// TODO: Ensure clean up.
				reject( err );
			}
		} );
	}

	/**
	 * Wrapper around all Git-related validation.
	 *
	 * @return {Promise<boolean>}
	 */
	async validateRepo() {
		try {
			await this.repoIsClean();

			return true;
		} catch ( err ) {
			return false;
		}
	}

	/**
	 * Ensure that the consuming project's repo is clean.
	 *
	 * @return {Promise<boolean|Error>}
	 */
	repoIsClean() {
		return new Promise( ( resolve, reject ) => {
			git.status( ( err, data ) => {
				if ( err ) {
					reject( err );
				}

				let {
					not_added,
					modified,
				} = data;

				if (
					!not_added.length
					&& !modified.length
				) {
					resolve( true );
				} else {
					reject( false );
				}
			} );
		} );
	}

	/**
	 * Ensure that the required data was provided at instantion time.
	 *
	 * @return {boolean}
	 */
	validateData() {
		let vals = [
			this.getData( KEYS.GB_DEPLOY_BUILDS_KEY ),
			this.getData( KEYS.GB_DEPLOY_ENVS_KEY ),
			this.getData( KEYS.GB_DEPLOY_CONFIG_KEY ),
		];

		/// TODO: Seems brittle...
		return vals.every( val => ( !!val && JSON.stringify( val ) !== '{}' ) );
	}

	/**
	 * Ensures that current instance points at valid environment.
	 *
	 * @return {boolean}
	 */
	validateEnvironment() {
		return Object.keys( this.getData( KEYS.GB_DEPLOY_ENVS_KEY ) ).includes( this.settings.environment );
	}

	/**
	 * Ensures that all builds provided at instantiation time are valid.
	 *
	 * @return {boolean}
	 */
	validateBuilds() {
		return !!this.builds && this.builds.length && this.builds.every( build => Object.keys( this.getData( KEYS.GB_DEPLOY_BUILDS_KEY ) ).includes( build.name ) );
	}

	/**
	 * Convert 'build strings' (ie. '<build>@<version>') to the correct format, enrich, and return.
	 *
	 * @param {Array<Object>} builds
	 * @return {Array<Object>}
	 */
	parseBuilds( builds=[] ) {
		builds = Array.isArray( builds ) ? builds : [ builds ];

		let validBuilds = this.getData( KEYS.GB_DEPLOY_BUILDS_KEY );

		return builds
			// Split.
			.map( build => build.split( '@' ) )
			// Coerce to object.
			.map( ( [ name, version ] ) => ( { name, version } ) )
			// Set version if required.
			.map( build => ( semver.valid( build.version ) ? build : { ...build, ...{ version: this.getTransientVersion() } } ) )
			// Enrich with data provided by project.
			.map( build => ( validBuilds[ build.name ] ? { ...validBuilds[ build.name ], ...build } : build ) )
			// Resolve file names.
			.map( build => ( { ...build, ...{ resolvedFiles: this.getResolvedFileNames( build ) } } ) );
	}

	/**
	 * Get a 'transient' version identifier.
	 *
	 * This is used for cases where a given build does not include a semver-compliant version identifier.
	 *
	 * @return {string}
	 */
	getTransientVersion() {
		let m = moment();

		return `${m.format( 'YYYY-MM-DD' )}-${m.unix()}`;
	}

	/**
	 * Given an object of 'build' data, extract the 'files', parse them, and generate an array of 'resolved' file names.
	 *
	 * @param {Object} build
	 * @return {Array}
	 */
	getResolvedFileNames( build = {} ) {
		if ( !build || typeof build !== 'object' || !build.files || !build.files.length ) {
			return null;
		}

		return build.files
			.map( file => {
				let fileData = path.parse( file.src );

				return `${file.base || fileData.name}-${build.version}${fileData.ext}`;
			} );
	}

	/**
	 * Given a `key`, extract the corresponding info.
	 *
	 * If the `key` does not exist, fall back to an empty object.
	 *
	 * @param {string} key
	 * @return {Object}
	 */
	getData( key ) {
		return this.data[ key ] || {};
	}

	/**
	 * Wrapper around the `clone` script.
	 *
	 * @return {Promise}
	 */
	doClone() {
		return new Promise( ( resolve, reject ) => {
			let f = fork( `${__dirname}/scripts/clone.js` );

			f.send( {
				action: 'CLONE',
				payload: {
					config: this.getData( KEYS.GB_DEPLOY_CONFIG_KEY ),
				},
			} );

			f.on( 'close', ( exitCode ) => {
				switch ( +exitCode ) {
					case 0:
						resolve();
						break;
					default:
						reject( new Error( MESSAGES.ERROR.FAILED_TO_CLONE ) );
						break;
				}
			} );
		} );
	}

	/**
	 * Wrapper around the `build` script.
	 *
	 * @return {Promise}
	 */
	doBuild() {
		return new Promise( ( resolve, reject ) => {
			let config = this.getData( KEYS.GB_DEPLOY_CONFIG_KEY );

			let { localBuildsPath = './' } = config;

			localBuildsPath = utils.normalizeDir( localBuildsPath );

			let f = fork( `${__dirname}/scripts/build.js`, [], { cwd: `${process.cwd()}/${localBuildsPath}` } );

			f.send( {
				action: 'BUILD',
				payload: {
					env: this.getData( KEYS.GB_DEPLOY_ENVS_KEY )[ this.settings.environment ],
				},
			} );

			f.on( 'close', ( exitCode ) => {
				switch ( +exitCode ) {
					case 0:
						resolve();
						break;
					default:
						reject( new Error( MESSAGES.ERROR.FAILED_TO_BUILD ) );
						break;
				}
			} );
		} );
	}

	/**
	 * Wrapper around the `migrate` script.
	 *
	 * @return {Promise}
	 */
	doMigrate( builds=[] ) {
		return new Promise( ( resolve, reject ) => {
			let config = this.getData( KEYS.GB_DEPLOY_CONFIG_KEY );

			let { repoDest = './', repoBuildsPath = './' } = config;

			repoDest = utils.normalizeDir( repoDest );
			repoBuildsPath = utils.normalizeDir( repoBuildsPath );

			let f = fork( `${__dirname}/scripts/migrate.js` );

			/// TODO: Ensure that each `build` object includes a `files` arr.
			let paths = builds
				.filter( build => !semver.valid( build.version ) )
				.map( build => {
					return build.files.map( ( file, i ) => ( {
						src: file.src,
						dest: `${repoDest}${repoBuildsPath}${build.resolvedFiles[ i ]}`,
					} ) );
				} )
				.reduce( ( acc, arr ) => { return [ ...acc, ...arr ] }, [] );

			f.send( {
				action: 'MIGRATE',
				payload: {
					paths,
				},
			} );

			f.on( 'close', ( exitCode ) => {
				switch ( +exitCode ) {
					case 0:
						resolve();
						break;
					default:
						reject( new Error( MESSAGES.ERROR.FAILED_TO_MIGRATE ) );
						break;
				}
			} );
		} );
	}

	/**
	 * Wrapper around the `deploy` script.
	 *
	 * @return {Promise}
	 */
	doDeploy() {
		return new Promise( ( resolve, reject ) => {
			let f = fork( `${__dirname}/scripts/deploy.js` );

			f.send( {
				action: 'DEPLOY',
				payload: {
					builds: this.builds,
					config: this.getData( KEYS.GB_DEPLOY_CONFIG_KEY ),
					env: this.getData( KEYS.GB_DEPLOY_ENVS_KEY )[ this.settings.environment ],
				},
			} );

			f.on( 'close', ( exitCode ) => {
				switch ( +exitCode ) {
					case 0:
						resolve();
						break;
					default:
						reject( new Error( MESSAGES.ERROR.FAILED_TO_DEPLOY ) );
						break;
				}
			} );
		} );
	}

	/**
	 * Remove files/folders introduced as part of the clone, build, migrate, and/or deployment processes.
	 *
	 * @return {Promise}
	 */
	doCleanup() {
		return new Promise( ( resolve, reject ) => {
			let config = this.getData( KEYS.GB_DEPLOY_CONFIG_KEY );

			let { repoDest = './' } = config;

			repoDest = utils.normalizeDir( repoDest );

			if ( !repoDest ) {
				reject( new Error( MESSAGES.ERROR.FAILED_TO_CLEAN ) );
				return;
			}

			del( repoDest ).then( resolve, reject );
		} );
	}
}

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = GbDeploy;

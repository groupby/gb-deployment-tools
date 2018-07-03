// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { fork } = require( 'child_process' );
const path = require( 'path' );

// Vendor
const merge = require( 'deepmerge' );
const semver = require( 'semver' );
const simpleGit = require( 'simple-git/promise' );

// Project
const { GbBase } = require( './gb-base' );
const { KEYS, MESSAGES, ENVS } = require( './data' );
const utils = require( './utils' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const git = simpleGit();

// --------------------------------------------------
// CORE
// --------------------------------------------------
class GbDeploy extends GbBase {
	constructor( {
		builds = [],
		opts = {},
		data = {},
	} = {} ) {
		super();

		this.data = data || {};
		this.settings = merge( {}, opts ); // Since we're not merging in any defaults, this is a clone of `opts`.
		this.opts = opts;
		this.builds = this.parseBuildStrings( builds );
	}

	/**
	 * Wrapper around validatation, clone, build, migrate, and deployment processes.
	 *
	 * @return {Promise}
	 */
	run() {
		return new Promise( async ( resolve, reject ) => {
			try {
				// Check repo sync'd, clean, etc.
				let statusData = await git.status();

				if ( !utils.ensureRepoIsSynced( statusData ) ) {
					throw new Error( MESSAGES.ERROR.REPO_OUT_OF_SYNC );
				}

				if ( !utils.ensureRepoIsClean( statusData ) ) {
					throw new Error( MESSAGES.ERROR.REPO_UNCLEAN );
				}

				if ( !this.validateData() ) {
					throw new Error( MESSAGES.ERROR.INVALID_DATA );
				}

				if ( !this.validateBuilds()) {
					throw new Error( `${MESSAGES.ERROR.INVALID_BUILDS}: <${Object.keys( this.getData( KEYS.BUILDS ) ).join( '|' )}>` );
				}

				if ( !this.validateEnvironment() ) {
					throw new Error( `${MESSAGES.ERROR.INVALID_ENV}: <${Object.keys( this.getData( KEYS.ENVS ) ).join( '|' )}>` );
				}

				// Perform additional validation for production deployments.
				if ( this.settings.environment === ENVS.PRODUCTION ) {
					// Prevent 'feature' branches from building/deploying to production.
					if ( !this.builds.every( build => semver.valid( build.version ) ) ) {
						throw new Error( MESSAGES.ERROR.MISSING_VERSION_PROD );
					}
				}

				console.log( MESSAGES.LIFECYCLE.PRE_CLONE );
				await this.doClone();
				console.log( MESSAGES.LIFECYCLE.POST_CLONE );

				// If not deploying to production, compile and migrate any builds which do not include a valid version identifier.
				if ( !this.builds.every( build => semver.valid( build.version ) ) ) {
					console.log( MESSAGES.LIFECYCLE.PRE_BUILD );
					await this.doBuild();
					console.log( MESSAGES.LIFECYCLE.POST_BUILD );

					console.log( MESSAGES.LIFECYCLE.PRE_MIGRATE );
					await this.doMigrate( this.builds.filter( build => !semver.valid( build.version ) ) );
					console.log( MESSAGES.LIFECYCLE.POST_MIGRATE );
				}

				console.log( MESSAGES.LIFECYCLE.PRE_COMMIT );
				await this.doCommit( { builds: this.builds, type: 'deploy' } );
				console.log( MESSAGES.LIFECYCLE.POST_COMMIT );

				console.log( MESSAGES.LIFECYCLE.PRE_CLEAN );
				await this.doCleanup();
				console.log( MESSAGES.LIFECYCLE.POST_CLEAN );

				resolve( MESSAGES.DEPLOY.SUCCESS );
				return;
			} catch ( err ) {
				reject( err );
			}
		} );
	}

	/**
	 * Ensure that the required data was provided at instantion time.
	 *
	 * @return {boolean}
	 */
	validateData() {
		let vals = [
			this.getData( KEYS.BUILDS ),
			this.getData( KEYS.ENVS ),
			this.getData( KEYS.CONFIG ),
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
		return Object.keys( this.getData( KEYS.ENVS ) ).includes( this.settings.environment );
	}

	/**
	 * Ensures that all builds provided at instantiation time are valid.
	 *
	 * @return {boolean}
	 */
	validateBuilds() {
		return !!this.builds && this.builds.length && this.builds.every( build => Object.keys( this.getData( KEYS.BUILDS ) ).includes( build.name ) );
	}
}

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = GbDeploy;

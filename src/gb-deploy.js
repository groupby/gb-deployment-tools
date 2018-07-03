// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { fork } = require( 'child_process' );
const path = require( 'path' );

// Vendor
const merge = require( 'deepmerge' );
const semver = require( 'semver' );
const simpleGit = require( 'simple-git' );

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
				if ( this.settings.environment === ENVS.PRODUCTION ) {
					// Prevent 'feature' branches from building/deploying to production.
					if ( !this.builds.every( build => semver.valid( build.version ) ) ) {
						throw new Error( MESSAGES.ERROR.MISSING_VERSION_PROD );
					}
				}

				await this.doClone();

				// If not deploying to production, compile and migrate any builds which do not include a valid version identifier.
				if ( !this.builds.every( build => semver.valid( build.version ) ) ) {
					await this.doBuild();
					await this.doMigrate( this.builds.filter( build => !semver.valid( build.version ) ) );
				}

				await this.doDeploy( { builds: this.builds, type: 'deploy' } );
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
	/// TODO: Consolidate w/ utility function.
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
}

// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = GbDeploy;

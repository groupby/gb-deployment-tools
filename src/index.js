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

// Project
const pkg = require( `${process.cwd()}/package` );
const utils = require( './utils' );

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const GB_DEPLOY_KEY = 'gb-deploy';
const GB_DEPLOY_CONFIG_KEY = 'config';
const GB_DEPLOY_BUILDS_KEY = 'builds';
const GB_DEPLOY_ENVS_KEY = 'environments';

// --------------------------------------------------
// CORE
// --------------------------------------------------
class GbDeploy {
	constructor( { builds = [], opts = {} } = {} ) {
		this.pkg = pkg || {};
		this.settings = merge( {}, opts ); // Since we're not merging in any defaults, this is a clone of `opts`.
		this.opts = opts;
		this.builds = this.parseBuilds( builds );
	}

	run() {
		return new Promise( async ( resolve, reject ) => {
			try {
				// Ensure that current project includes required config.
				if ( !this.hasGbDeployData() ) {
					throw new Error( 'Whoops, looks like this project is not set up for use with `GbDeploy`' );
				}

				// Ensure that `builds` and `environment` are valid.
				if ( !this.validateBuilds() ) {
					throw new Error( `Must include one or more valid builds: <${Object.keys( this.getData( GB_DEPLOY_BUILDS_KEY ) ).join( '|' )}>` );
				}

				if ( !this.validateEnvironment() ) {
					throw new Error( `Must include a valid environment: <${Object.keys( this.getData( GB_DEPLOY_ENVS_KEY ) ).join( '|' )}>` );
				}

				// Perform additional validation for production deployments.
				if ( this.settings.environment === 'production' ) {
					// Prevent 'feature' branches from building/deploying to production.
					if ( !this.builds.every( build => semver.valid( build.version ) ) ) {
						throw new Error( 'When deploying to production, all builds must include a semver-compliant version identifier (ie. `<build>@<version>`)' );
					}
				}

				await this.doClone();

				// If not deploying to production, compile any builds which do not include a valid version identifier.
				if ( !this.builds.every( b => semver.valid( b.version ) ) ) {
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

	validateEnvironment() {
		return Object.keys( this.getData( GB_DEPLOY_ENVS_KEY ) ).includes( this.settings.environment );
	}

	validateBuilds() {
		return !!this.builds && this.builds.length && this.builds.every( build => Object.keys( this.getData( GB_DEPLOY_BUILDS_KEY ) ).includes( build.name ) );
	}

	parseBuilds( builds=[] ) {
		let validBuilds = this.getData( GB_DEPLOY_BUILDS_KEY );

		builds = Array.isArray( builds ) ? builds : [ builds ];

		return builds
			.map( build => build.split( '@' ) )
			.map( ( [ name, version ] ) => ( { name, version } ) )
			.map( build => ( semver.valid( build.version ) ? build : { ...build, ...{ version: this.getTransientVersion() } } ) )
			.map( build => ( validBuilds[ build.name ] ? { ...validBuilds[ build.name ], ...build } : build ) )
			.map( build => ( { ...build, ...{ resolvedFiles: this.getResolvedFileNames( build ) } } ) );
	}

	getTransientVersion() {
		let m = moment();

		return `${m.format( 'YYYY-MM-DD' )}-${m.unix()}`;
	}

	getResolvedFileNames( build = {} ) {
		if (
			!build
			|| typeof build !== 'object'
			|| !build.files
			|| !build.files.length
		) {
			return null;
		}

		return build.files
			.map( file => {
				let fileData = path.parse( file.src );

				return `${file.base || fileData.name}-${build.version}${fileData.ext}`;
			} );
	}

	getPkg() {
		return this.pkg || {};
	}

	getData( key ) {
		let data = this.getPkg()[ GB_DEPLOY_KEY ];

		if ( !data || typeof data !== 'object' ) {
			return {};
		}

		return data[ key ] || {};
	}

	hasGbDeployData() {
		let vals = [
			this.getData( GB_DEPLOY_BUILDS_KEY ),
			this.getData( GB_DEPLOY_ENVS_KEY ),
			this.getData( GB_DEPLOY_CONFIG_KEY ),
		];

		/// TODO: Seems brittle...
		return vals.every( val => ( !!val && JSON.stringify( val ) !== '{}' ) );
	}

	doClone() {
		return new Promise( ( resolve, reject ) => {
			let f = fork( `${__dirname}/scripts/clone.js` );

			f.send( {
				action: 'CLONE',
				payload: {
					config: this.getData( GB_DEPLOY_CONFIG_KEY ),
				},
			} );

			f.on( 'close', ( exitCode ) => {
				switch ( +exitCode ) {
					case 0:
						resolve();
						break;
					default:
						reject( new Error( 'Failed to clone repository. Please ensure that the project contains valid `repoSrc` and `repoDest` data.' ) );
						break;
				}
			} );
		} );
	}

	doBuild() {
		return new Promise( ( resolve, reject ) => {
			let config = this.getData( GB_DEPLOY_CONFIG_KEY );

			let {
				localBuildsPath = './',
			} = config;

			localBuildsPath = utils.normalizeDir( localBuildsPath );

			let f = fork( `${__dirname}/scripts/build.js`, [], { cwd: `${process.cwd()}/${localBuildsPath}` } );

			f.send( {
				action: 'BUILD',
				payload: {
					env: this.getData( GB_DEPLOY_ENVS_KEY )[ this.settings.environment ],
				},
			} );

			f.on( 'close', ( exitCode ) => {
				switch ( +exitCode ) {
					case 0:
						resolve();
						break;
					default:
						reject( new Error( 'Failed to build. Please ensure that the target environment includes a valid `buildScript`' ) );
						break;
				}
			} );
		} );
	}

	doMigrate( builds=[] ) {
		return new Promise( ( resolve, reject ) => {
			let config = this.getData( GB_DEPLOY_CONFIG_KEY );

			let {
				repoDest = './',
				repoBuildsPath = './',
			} = config;

			repoDest = utils.normalizeDir( repoDest );
			repoBuildsPath = utils.normalizeDir( repoBuildsPath );

			let f = fork( `${__dirname}/scripts/migrate.js` );

			/// TODO: Ensure that each `build` object includes a `files` arr.
			let paths = builds
				.filter( build => !semver.valid( build.verison ) )
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
						reject( new Error( 'Failed to migrate files. Please ensure that all file references are valid.' ) );
						break;
				}
			} );
		} );
	}

	doDeploy() {
		return new Promise( ( resolve, reject ) => {
			let f = fork( `${__dirname}/scripts/deploy.js` );

			f.send( {
				action: 'DEPLOY',
				payload: {
					builds: this.builds,
					config: this.getData( GB_DEPLOY_CONFIG_KEY ),
					env: this.getData( GB_DEPLOY_ENVS_KEY )[ this.settings.environment ],
				},
			} );

			f.on( 'close', ( exitCode ) => {
				switch ( +exitCode ) {
					case 0:
						resolve();
						break;
					default:
						reject( new Error( 'Failed to deploy updates.' ) );
						break;
				}
			} );
		} );
	}

	doCleanup() {
		return new Promise( ( resolve, reject ) => {
			let config = this.getData( GB_DEPLOY_CONFIG_KEY );

			let {
				repoDest = './',
			} = config;

			repoDest = utils.normalizeDir( repoDest );

			if (
				!repoDest
			) {
				reject();
				return;
			}

			del( repoDest ).then( paths => {
				resolve();
			} ).catch( err => {
				console.log( err );
				reject();
			} );
		} );
	}
}


// --------------------------------------------------
// PUBLIC API
// --------------------------------------------------
module.exports = GbDeploy;

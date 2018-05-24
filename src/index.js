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
					throw new Error( 'Whoops, looks like this project is not set up for use with `GbDeploy`' );;
				}

				// Ensure that `builds` and `environment` are valid.
				if ( !this.validateBuilds() ) {
					throw new Error( `Must include one or more valid builds: <${Object.keys( this.getGbDeployBuilds() ).join( '|' )}>` );;
				}

				if ( !this.validateEnvironment() ) {
					throw new Error( `Must include a valid environment: <${Object.keys( this.getGbDeployEnvs() ).join( '|' )}>` );;
				}

				// Perform additional validation for production deployments.
				if ( this.settings.environment === 'production' ) {
					// Prevent 'feature' branches from building/deploying to production.
					if ( !this.builds.every( build => semver.valid( build.version ) ) ) {
						throw new Error( 'When deploying to production, all builds must include a semver-compliant version identifier (ie. `<build>@<version>`)' );;
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
		return Object.keys( this.getGbDeployEnvs() ).includes( this.settings.environment );
	}

	validateBuilds() {
		return !!this.builds && this.builds.length && this.builds.every( build => Object.keys( this.getGbDeployBuilds() ).includes( build.name ) );
	}

	parseBuilds( builds=[] ) {
		let validBuilds = this.getGbDeployBuilds();

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

	getGbDeployBuilds() {
		return this.getGbDeployData()[ 'builds' ] || {};
	}

	getGbDeployEnvs() {
		let envs = this.getGbDeployData()[ 'environments' ];

		if ( !envs || typeof envs !== 'object' ) {
			return {};
		}

		// Add `name` key to each 'env' object, smoosh 'em pack together, and return the result.
		return Object.keys( envs )
			.map( env => {
				return {
					[ env ]: {
						...envs[ env ],
						name: env,
					}
				};
			} )
			.reduce( ( o, data ) => {
				return { ...o, ...data };
			}, {} );
	}

	getGbDeployEnv( env = '' ) {
		return this.getGbDeployEnvs()[ env ] || {};
	}

	getGbDeployConfig() {
		return this.getGbDeployData()[ 'config' ] || {};
	}

	getGbDeployData() {
		return (
			!!this.pkg
			&& typeof this.pkg === 'object'
			&& !Array.isArray()
			&& this.pkg[ 'gb-deploy' ]
		) ? pkg[ 'gb-deploy' ] : {};
	}

	hasGbDeployData() {
		let vals = [
			this.getGbDeployBuilds(),
			this.getGbDeployConfig(),
			this.getGbDeployEnvs(),
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
					config: this.getGbDeployConfig(),
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
			let config = this.getGbDeployConfig();

			let {
				localBuildsPath = './',
			} = config;

			localBuildsPath = utils.normalizeDir( localBuildsPath );

			let f = fork( `${__dirname}/scripts/build.js`, [], { cwd: `${process.cwd()}/${localBuildsPath}` } );

			f.send( {
				action: 'BUILD',
				payload: {
					env: this.getGbDeployEnv( this.settings.environment ),
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
			let config = this.getGbDeployConfig();

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
					config: this.getGbDeployConfig(),
					env: this.getGbDeployEnv( this.settings.environment ),
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
			let config = this.getGbDeployConfig();

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

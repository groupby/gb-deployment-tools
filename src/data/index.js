module.exports = {
	KEYS: {
		GB_DEPLOY_KEY: 'gb-deploy',
		GB_DEPLOY_CONFIG_KEY: 'config',
		GB_DEPLOY_BUILDS_KEY: 'builds',
		GB_DEPLOY_ENVS_KEY: 'environments',
		GB_RELEASE_KEY: 'gb-deploy', /// TODO: Update this, or consolidate with `GB_DEPLOY_KEY`?
	},
	MESSAGES: {
		ERROR: {
			FAILED_TO_BUILD: 'Failed to build. Please ensure that the target environment includes a valid `buildScript`',
			FAILED_TO_CLEAN: 'Failed to clean up.',
			FAILED_TO_CLONE: 'Failed to clone repository. Please ensure that the project contains valid `repoSrc` and `repoDest` data.',
			FAILED_TO_DEPLOY: 'Failed to deploy updates.',
			FAILED_TO_MIGRATE: 'Failed to migrate files. Please ensure that all file references are valid.',
			INVALID_RELEASE_TYPE: 'Whoops, the release type is invalid.',
			INVALID_DATA: 'Whoops, looks like this project is not set up for use with `GbDeploy`',
			INVALID_BUILDS: 'Must include one or more valid builds',
			INVALID_ENV: 'Must include a valid environment',
			MISSING_VERSION_PROD: 'When deploying to production, all builds must include a semver-compliant version identifier (ie. `<build>@<version>`)',
			REPO_UNCLEAN: 'Whoops, looks like this project has a dirty repo. Please commit or stash your changes before deploying',
		},
	},
};

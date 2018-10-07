module.exports = {
	CONFIG: {
		'gb-deployment-tools': {
			config: {
				repoName: '<repoName>',
				repoOwner: '<repoOwner>',
				localBuildsPath: '<localBuildsPath>',
				repoSrc: '<repoSrc>',
				repoDest: '<repoDest>',
				repoBuildsPath: '<repoBuildsPath>',
			},
			environments: {
				'<environment>': {
					name: '<name>',
					manifest: '<manifest>',
					buildScript: '<buildScript>',
				},
			},
			builds: {
				'<build>': {
					files: [
						{
							src: '<src>',
							base: '<base>',
						},
					],
					resolvedFilePrefix: '<resolvedFilePrefix>',
				},
			},
		},
	},
};

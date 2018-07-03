// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const simpleGit = require('simple-git');

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const git = simpleGit();

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
const doClone = (data) => {
	const {
		config = {},
	} = data;

	const {
		repoSrc = '',
		repoDest = '',
	} = config;

	if (
		!repoSrc
		|| !repoDest
	) {
		process.exit(1);
	}

	git.clone(repoSrc, repoDest, [], (err) => {
		if (err) {
			process.exit(1);
		} else {
			process.exit(0);
		}
	});
};

// --------------------------------------------------
// INIT
// --------------------------------------------------
process.on('message', (data = {}) => {
	switch (data.action) {
	case 'CLONE':
		doClone(data.payload);
		break;
	default:
		process.exit(1);
		break;
	}
});

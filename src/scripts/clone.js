// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const simpleGit = require('simple-git/promise');

// --------------------------------------------------
// DECLARE VARS
// --------------------------------------------------
const git = simpleGit();

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
const doClone = (data = {}) => {
	try {
		git.clone(data.config.repoSrc, data.config.repoDest, [] )
			.then( () => process.exit(0) )
			.catch( () => process.exit(1) );
	} catch ( err ) {
		process.exit(1);
	}
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

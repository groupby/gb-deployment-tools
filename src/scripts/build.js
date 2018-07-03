// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Node
const { execSync } = require('child_process');

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
const doBuild = (data = {}) => {
	try {
		execSync(data.env.buildScript);
		process.exit(0);
	} catch (err) {
		process.exit(1);
	}
};

// --------------------------------------------------
// INIT
// --------------------------------------------------
process.on('message', (data = {}) => {
	switch (data.action) {
	case 'BUILD':
		doBuild(data.payload);
		break;
	default:
		console.log(`FAILED TO MATCH ACTION: ${data.action}`);
		process.exit(1);
		break;
	}
});

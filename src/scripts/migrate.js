// --------------------------------------------------
// IMPORT MODULES
// --------------------------------------------------
// Vendor
const cpFile = require('cp-file');

// --------------------------------------------------
// DECLARE FUNCTIONS
// --------------------------------------------------
const doMigrate = (data = {}) => {
	const {
		paths = [],
	} = data;

	if (
		!paths
		|| !Array.isArray(paths)
		|| !paths.length
	) {
		process.exit(1);
	}

	const promises = paths.map(({ src, dest }) => cpFile(src, dest));

	Promise.all(promises)
		.then(() => {
			process.exit(0);
		})
		.catch(() => {
			process.exit(1);
		});
};

// --------------------------------------------------
// INIT
// --------------------------------------------------
process.on('message', (data = {}) => {
	switch (data.action) {
	case 'MIGRATE':
		doMigrate(data.payload);
		break;
	default:
		process.exit(1);
		break;
	}
});

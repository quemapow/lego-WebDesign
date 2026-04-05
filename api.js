import('./server/api.js').catch((error) => {
	console.error(error);
	process.exit(1);
});
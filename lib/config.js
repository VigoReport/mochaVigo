/**
 * Created by Scw on 01-Aug-16.
 */
var path = require('path');

var config = {
	splitChar: process.platform === 'win32' ? '\\' : '/', //  used for window ubuntu directory path change
	reportDir: path.join('.', 'vigoReport'),
	reportName: 'VigoReport'
};


module.exports = function (options) {
	// Base Directories
	config.reportDir = _getOption('reportDir', options);
	config.reportTitle = _getOption('reportTitle', options);
	config.autoOpen = _getOption('autoOpen', options, true);
	config.nodeModulesDir = path.join(__dirname, '..', 'node_modules');


	// Source Directories
	config.srcAssets = path.join(__dirname, '..', 'npmBuild', 'dist', 'main.js');
	config.srcHtml = path.join(__dirname, '..', 'npmBuild', 'index.html');

	config.trgAssets = path.join('.', config.reportDir, 'dist');

	// change Json data in file path
	config.changeDataPath = path.join('.', config.reportDir, 'dist', 'main.js')
	return config;
};

function _getOption(optToGet, options, isBool) {
	var envVar = 'VIGOREPORT_' + optToGet.toUpperCase();
	// Order of precedence
	// 1. Config option
	// 2. Environment variable
	// 3. Base config
	if (options && typeof options[optToGet] !== 'undefined') {
		return (isBool && typeof options[optToGet] === 'string') ?
		options[optToGet] === 'true'
			: options[optToGet];
	}
	if (typeof process.env[envVar] !== 'undefined') {
		return (isBool && typeof options[optToGet] === 'string') ?
		process.env[envVar] === 'true'
			: process.env[envVar];
	}
	return (isBool && typeof config[optToGet] === 'string') ?
	config[optToGet] === 'true'
		: config[optToGet];
}
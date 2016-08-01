/**
 * Created by Scw on 01-Aug-16.
 */
var path = require('path');

var config = {
  splitChar: process.platform === 'win32' ? '\\' : '/',
  reportDir: path.join('.', './test/VigoReport'),
  reportName: 'VigoReport'
};


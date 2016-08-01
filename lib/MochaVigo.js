'use strict'
/*jshint loopfunc: true */
//chalk = require('chalk'),
//opener = require('opener'),

let mocha = require('mocha'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  stringify = require('json-stringify-safe'),
  Utils = require('./Utils'),
  async = require('async')


const sourceFile = path.join(__dirname, '..', 'npmBuild/index.html');
const sourceAssets = path.join(__dirname, '..', 'npmBuild/dist/main.js');
const targetFile = path.join('.', 'test\\VigoReport\\index.html');
const changeDataPath = path.join('.', 'test\\VigoReport\\dist\\main.js');


let Base = mocha.reporters.Base;

/*Highlight.configure({
 useBR: true,
 languages: ['javascript']
 })*/

module.exports = MochaVigo

/**
 * Initialize a new reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function MochaVigo(runner, options) {

  let reporterOpts = options.reporterOptions || {};

  let self = this
  Base.call(self, runner)

  // Show the Spec Reporter in the console
  new mocha.reporters.Spec(runner)

  let allSuites = {},
    allTests = [],
    allPending = [],
    allFailures = [],
    allPasses = [],
    endCalled = false

  /* runner.on('test end', function (test) {
   allTests.push(test)
   })

   runner.on('pending', function (test) {
   allPending.push(test)
   })

   runner.on('pass', function (test) {
   allPasses.push(test)
   })

   runner.on('fail', function (test) {
   allFailures.push(test)
   })*/

  runner.on('end', function () {
    try {
      if (!endCalled) {
        endCalled = true // end gets called more than once for some reason so this ensures we only do this once

        allSuites = self.runner.suite

        Utils.TraverseSuites(allSuites)

        let obj = {
          reportTitle: 'VigoReport',
          stats: self.stats,
          suites: allSuites,
          //allTests: allTests.map(Utils.CleanTest),
          //allPending: allPending,
          //allPasses: allPasses.map(Utils.CleanTest),
          //allFailures: allFailures.map(Utils.CleanTest),
          copyrightYear: new Date().getFullYear()
        }

        obj.stats.total = Utils.GetTotalTestsCount()
        obj.stats.pass = obj.stats.passes
        obj.stats.fail = obj.stats.failures
        obj.stats.pending = obj.stats.pending
        obj.stats.finish = obj.stats.end


        let passPercentage = Math.round((obj.stats.pass / (obj.stats.total - obj.stats.pending)) * 1000) / 10
        let pendingPercentage = Math.round((obj.stats.pending / obj.stats.total) * 1000) / 10

        obj.stats.passPer = passPercentage
        obj.stats.pendingPer = pendingPercentage
        obj.stats.other = (obj.stats.pass + obj.stats.fail + obj.stats.pending) - obj.stats.tests
        //obj.stats.hasOther = obj.stats.other > 0
        obj.stats.skip = obj.stats.total - obj.stats.tests
        obj.stats.skipPer = Math.round((obj.stats.skip / obj.stats.total) * 1000) / 10
        //obj.stats.hasSkipped = obj.stats.skip > 0
        obj.stats.fail = obj.stats.fail - obj.stats.other
        obj.stats.failPer = Math.round((obj.stats.fail / obj.stats.total) * 1000) / 10
        //obj.stats.passPercentClass = _getPercentClass(passPercentage)
        //obj.stats.pendingPercentClass = _getPercentClass(pendingPercentage)

        delete obj.stats.passes
        delete obj.stats.failures
        delete obj.stats.end

        Utils.ApplyChildMetaHierarchy(obj.suites)

        let os = Utils.getOsInfo()
        let sdk = Utils.getSDKinfo()

        let finalObj = {
          build: Object.assign(obj.stats, { os: os, sdk: sdk, tz: new Date().getTimezoneOffset() * -1 }),
          suites: obj.suites.suites,
          projectKey: reporterOpts['project-key']
        }

        async.auto({

            createDirs: function (cb) {
              Utils.createDirs('./test/VigoReport/', null, cb)
            },
            copyFile: ['createDirs', function (cb) {
              Utils.copyFile(sourceFile, targetFile)
                .then(function (success) {
                  cb()
                })
                .catch(function (err) {
                  cb(err)
                })
            }],
            copyAssets: ['createDirs', function (cb) {
              Utils.copyFile(sourceAssets, './test/VigoReport/dist/main.js')
            }],
            replaceJsonData: ['createDirs', function (cb) {
              Utils.jsonDataReplace(changeDataPath, finalObj)
                .then(function (success) {
                  cb()
                })
                .catch(function (err) {
                  cb(err)
                })
            }]
          },
          function (err, results) {
            if (err) throw err;
            console.log('Report are ready!')
          })

        if (reporterOpts['project-key']) {
          Utils.handShakeWithVigo(finalObj)
        }
        //Utils.saveToFile(stringify(finalObj, null, 2), '.tmp/mochaVigo.json', function () {})
      }
    }
    catch (e) { //required because thrown errors are not handled directly in the event emitter pattern and mocha does not have an "on error"
      console.error('Problem with mochavigo: %s', e.stack)
    }
  })
}


/**
 * Strip the function definition from `str`,
 * and re-indent for pre whitespace.
 */

function cleanCode(str) {
  str = str
    .replace(/\r\n?|[\n\u2028\u2029]/g, '\n').replace(/^\uFEFF/, '')
    .replace(/^function *\(.*\) *{|\(.*\) *=> *{?/, '')
    .replace(/\s+\}$/, '')

  let spaces = str.match(/^\n?( *)/)[1].length,
    tabs = str.match(/^\n?(\t*)/)[1].length,
    re = new RegExp('^\n?' + (tabs ? '\t' : ' ') + '{' + (tabs ? tabs : spaces) + '}', 'gm')

  str = str.replace(re, '')
  str = str.replace(/^\s+|\s+$/g, '')
  return str
}

/**
 * Return a classname based on percentage
 *
 * @param {Integer} pct
 * @api private
 */

function _getPercentClass(pct) {
  if (pct <= 50) {
    return 'danger'
  }
  else if (pct > 50 && pct < 80) {
    return 'warning'
  }
  else {
    return 'success'
  }
}

'use strict'
let fs = require('fs'),
  _ = require('lodash'),
  _u = require('underscore'),
  chalk = require('chalk'),
  Highlight = require('highlight.js'),
  uuid = require('node-uuid')

//const VIGO_BASE = 'http://localhost:3000/'
const VIGO_BASE = 'https://vigoreport.io/'
const PASS = 1
const FAIL = 2
const SKIP = 3
const PENDING = 4

exports.ApplyChildMetaHierarchy = ApplyChildMetaHierarchy
exports.RemoveAllPropsFromObjExcept = RemoveAllPropsFromObjExcept
exports.SumUpChildMeta = SumUpChildMeta
exports.CleanTest = CleanTest
exports.GetTotalTestsCount = GetTotalTestsCount
exports.CleanSuite = CleanSuite
exports.TraverseSuites = TraverseSuites
exports.getOsInfo = getOsInfo
exports.getSDKinfo = getSDKinfo
exports.handShakeWithVigo = handShakeWithVigo
exports.saveToFile = saveToFile


function SumUpChildMeta(suite) {

  let queue = []
  let obj = {
    pass: suite.meta.pass || 0,
    fail: suite.meta.fail || 0,
    skip: suite.meta.skip || 0,
    total: suite.meta.total || 0,
    pending: suite.meta.pending || 0
  }

  let next = suite.suites
  while (next) {
    _.each(next, (suite, i)=> {

      if (suite.meta) {

        obj.pass += suite.meta.pass
        obj.fail += suite.meta.fail
        obj.skip += suite.meta.skip
        obj.pending += suite.meta.pending
        obj.total += suite.meta.total
      }

      queue.push(suite)
    })
    next = queue.shift()
  }
  //console.log(obj)
  return obj
}

function ApplyChildMetaHierarchy(build) {

  let queue = []
  let next = build
  while (next) {
    _.map(next.suites, (b)=> {
      b.childMeta = SumUpChildMeta(b)
      queue.push(b)
    })
    next = queue.shift()
  }

}


/**
 * Remove all properties from an object except
 * those that are in the propsToKeep array.
 *
 * @param {Object} obj
 * @param {Array} propsToKeep
 * @api private
 */
function RemoveAllPropsFromObjExcept(obj, propsToKeep) {
  _.forOwn(obj, function (val, prop) {
    if (propsToKeep.indexOf(prop) === -1) {
      delete obj[prop]
    }
  })
}

/**
 * Do a breadth-first search to find
 * and format all nested 'suite' objects.
 *
 * @param {Object} suite
 * @api private
 */
function TraverseSuites(suite) {
  let queue = [],
    next = suite
  while (next) {
    if (next.root) {
      CleanSuite(next)
    }
    if (next.suites.length) {
      _.each(next.suites, function (suite, i) {
        CleanSuite(suite)
        queue.push(suite)
      })
    }
    next = queue.shift()
  }
}

let TOTAL_TEST = 0;
/**
 * Modify the suite object to add properties needed to render
 * the template and remove properties we do not need.
 *
 * @param {Object} suite
 * @api private
 */
function CleanSuite(suite) {
  suite.uuid = uuid.v4()

  let cleanTests = _.map(suite.tests, CleanTest)
  let passingTests = _u.where(cleanTests, { state: 'passed' })
  let failingTests = _u.where(cleanTests, { state: 'failed' })
  let pendingTests = _u.where(cleanTests, { pending: true })
  let skippedTests = _u.where(cleanTests, { skipped: true })
  let duration = 0

  _.each(cleanTests, function (test) {
    duration += test.duration
  })

  TOTAL_TEST += suite.tests ? suite.tests.length : 0

  suite.tests = cleanTests
  suite.fullFile = suite.file || ''
  suite.file = suite.file ? suite.file.replace(process.cwd(), '') : ''
  //suite.passes = passingTests
  //suite.failures = failingTests
  //suite.pending = pendingTests
  //suite.skipped = skippedTests
  suite.hasTests = suite.tests.length > 0
  suite.hasSuites = suite.suites.length > 0
  suite.meta = {
    total: suite.tests.length,
    pass: passingTests.length,
    fail: failingTests.length,
    skip: skippedTests.length,
    pending: pendingTests.length,
    hasPass: passingTests.length > 0,
    hasFail: failingTests.length > 0,
    hasPending: pendingTests.length > 0,
    hasSkipped: skippedTests.length > 0,
    duration: duration
  }

  if (suite.root) {
    suite.rootEmpty = suite.total === 0
  }

  RemoveAllPropsFromObjExcept(suite, [
    'title',
    'fullFile',
    'meta',
    'file',
    'tests',
    'suites',
    'passes',
    'failures',
    'pending',
    'skipped',
    'hasTests',
    'hasSuites',
    'total',
    'totalPasses',
    'totalFailures',
    'totalPending',
    'totalSkipped',
    'hasPasses',
    'hasFailures',
    'hasPending',
    'hasSkipped',
    'root',
    'uuid',
    'duration',
    'rootEmpty',
    '_timeout'
  ])
}

function GetTotalTestsCount() {
  return TOTAL_TEST;
}

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @param {Object} test
 * @return {Object}
 * @api private
 */
function CleanTest(test) {

  let err = test.err ? _.pick(test.err, ['name', 'message', 'stack']) : test.err


  if (err && err.stack) {
    err.stack = Highlight.fixMarkup(Highlight.highlightAuto(err.stack).value)
  }

  let cleaned = {
    title: test.title,
    fullTitle: test.fullTitle(),
    timedOut: test.timedOut,
    duration: test.duration || 0,
    speed: test.speed,
    //pass: test.state === 'passed',
    //fail: test.state === 'failed',
    //pending: test.pending,
    err: err,
    isRoot: test.parent.root,
    uuid: uuid.v4(),
    parentUUID: test.parent.uuid
  }

  if (test.state === 'passed') {
    cleaned.state = PASS
  }
  else if (test.state === 'failed') {
    cleaned.state = FAIL
  }
  else {
    cleaned.state = SKIP
  }
  //cleaned.skipped = (!cleaned.pass && !cleaned.fail && !cleaned.pending)

  return cleaned
}


function getOsInfo() {
  let os = require('os')
  return {
    name: os.type(),
    hostname: os.hostname(),
    arc: os.arch(),
    version: os.release(),
    ram: Math.round((((os.totalmem() / 1024) / 1024) / 1024)) + ' GB'
  }

}

function getSDKinfo(cb) {

  return {
    name: 'Node',
    version: process.version,
    arc: process.arch,
    npmVersion: ""
  }
}

function handShakeWithVigo(vigoData) {

  let request = require('request-json');
  let client = request.createClient(VIGO_BASE);
  client
    .post('api/v1/build/sync/mocha', vigoData, function (error, response, body) {
      //if (!error && response.statusCode == 200) {
      console.log(error, body)
      //}
    })

}


function saveToFile(data, outFile, callback) {
  let writeFile
  try {
    writeFile = fs.openSync(outFile, 'w')
    fs.writeSync(writeFile, data)
    fs.close(writeFile)
    callback(null, outFile)
  } catch (err) {
    console.log('\n[' + chalk.gray('mochavigo') + '] Error: Unable to save ' + outFile + '\n' + err + '\n')
    callback(err)
  }
}



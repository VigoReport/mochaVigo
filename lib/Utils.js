'use strict'
let fs = require('fs'),
  _ = require('lodash'),
  ncp = require('ncp'),
  _u = require('underscore'),
  chalk = require('chalk'),
  Highlight = require('highlight.js'),
  uuid = require('node-uuid'),
  mkdirp = require('mkdirp');

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
exports.createDirs = createDirs
exports.copyAssetsData = copyAssetsData
exports.copyFile = copyFile
exports.jsonDataReplace = jsonDataReplace


function SumUpChildMeta(suite) {

  let queue = []
  let obj = {
    pass: suite.meta.pass || 0,
    fail: suite.meta.fail || 0,
    skip: suite.meta.skip || 0,
    total: suite.meta.total || 0,
    pending: suite.meta.pending || 0,
    duration: suite.duration || 0
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
        obj.duration += suite.meta.duration

        obj.passPer = obj.pass * 100 / obj.total
        obj.failPer = obj.fail * 100 / obj.total
        obj.skipPer = obj.skip * 100 / obj.total
        obj.pendingPer = obj.pending * 100 / obj.total
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
  let duration = 0

  let testCount = _u.countBy(suite.tests, (t)=> {
    switch (t.state) {

      case 'passed':
        return 'pass'
        break
      case 'failed':
        return 'fail'
        break
      case 'skipped':
        return 'skip'
        break
      case 'pending':
        return 'skip'
        break
      default:
        return 'skip'
        break
    }
  })

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
    total: suite.tests.length || 0,
    pass: testCount.pass || 0,
    fail: testCount.fail || 0,
    skip: testCount.skip || 0,
    pending: testCount.pending || 0,
    hasPass: testCount.pass > 0,
    hasFail: testCount.fail > 0,
    hasPending: testCount.pending > 0,
    hasSkipped: testCount.skip > 0,
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
    //uuid: uuid.v4(),
    //parentUUID: test.parent.uuid
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

  console.log(chalk.blue('Welcome to VigoReport, We are ready to launch.', '\n', chalk.white('identifying....')))
  console.log(chalk.white('----------------------------------------------------'))

  let request = require('request-json');
  let client = request.createClient(VIGO_BASE);
  client
    .post('api/v1/build/sync/mocha', vigoData, function (error, response, body) {

      if (body && body.flag) {

        let dashboard = 'https://vigoreport.io/app/builds/' + body.data.id

        console.log(chalk.green(
          '\n' + chalk.blue.bold('Build-' + body.data.sequence) + ' is successfully reached to vigo world,\nYou can checkout this report on vigo dashboard \n' +
          chalk.blue.underline.bold(dashboard) +
          '\n\nThank you for being our friend :)'
        ))
      }
      if (error || !body.flag) {
        console.log(chalk.red('Error', JSON.stringify(error || body)))
      }
    })

}

//copy all assets to test directory
function copyFile(source, target) {
  return new Promise(function (resolve, reject) {
    var rd = fs.createReadStream(source);
    rd.on('error', reject);
    var wr = fs.createWriteStream(target);
    wr.on('error', reject);
    wr.on('finish', resolve);
    rd.pipe(wr);
  });
}

//create directories
function createDirs(config, inline, callback) {
  var dirs = [config];
  // if (!inline) {
  dirs = dirs.concat([config + '/dist']);
  // }
  dirs.forEach(function (dir) {
    mkdirp.sync(dir);
  });
  callback(null, 'done');
}


function copyAssetsData(source, callback) {
  ncp(source, './test/VigoReport/main.js', function (err) {
    if (err) callback(err);
    //callback(null, 'done');
  });
}


function jsonDataReplace(targetFile, file) {
  return new Promise(function (resolve, reject) {
    fs.readFile(targetFile, 'utf8', function (err, data) {
      if (err) {
        reject(err)
        //return console.log(err);
      }
      var result = data.replace('jsonData', JSON.stringify(file));

      fs.writeFile(targetFile, result, 'utf8', function (err) {
          if (err) reject(err)//return console.log(err);
          resolve
        }
      );
    });
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



mochaVigo
=========
MochaVigo is a custom reporter for use with the Javascript testing framework, [mocha][1]. It sends your test result to [web][2] where you can get visualize your test suites.



##Sample Report

You can show sample report [here][3].

##Prerequisites
You will need project-key For the configuration.

>**Step to get project-key**

1. [Login to Vigoreport][2]
2. Create Project and get your project-key by clicking on edit icon.
3. Copy project-key `project-key:6c32f1d263323cead18805129aac43b536a5xxxx`


##Usage and Options

1. Add MochaVigo to your project:

  `npm install --save-dev mochavigo`

2. Add Project key into --reporter-options and use the MochaVigo 

  `mocha testfile.js --reporter mochavigo --reporter-options project-key={yourkey}`
  
   ------------------------------------------------------------------  OR ---------------------------------------------------------------
     If you are using mocha programatically:

  ```js
   var mocha = new Mocha({
      reporter: 'mochavigo'
      reporter:{
          options:{
            project-key:{yourkey}
          }
      }
  });
  ```
  
   ------------------------------------------------------------------  OR ---------------------------------------------------------------
If you are using mocha.opts
 
  `--reporter mochavigo` <br />
  `--reporter-options project-key={yourkey}`
  
[1]: https://github.com/mochajs/mocha
[2]: https://vigoreport.io/login
[3]: https://vigoreport.io/app/builds/5796ee8722874866792c6c79

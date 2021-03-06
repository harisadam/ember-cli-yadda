var yadda = require('yadda');
var Filter = require('broccoli-filter');
var path = require('path');

/* jshint node: true */
'use strict';

// voorbeeld van de brocolli-filter readme. bah en bah
FeatureParser.prototype = Object.create(Filter.prototype);
FeatureParser.prototype.constructor = FeatureParser;
function FeatureParser(inputNode, testFramework) {
  this.testFramework = testFramework;
  Filter.call(this, inputNode);
}
FeatureParser.prototype.extensions = ['feature', 'spec', 'specification'];
FeatureParser.prototype.targetExtension = 'js';
FeatureParser.prototype.processString = function(content, relativePath) {
  var feature = new yadda.parsers.FeatureParser().parse(content);
  var basePath = relativePath.split('/').slice(0,2).join('/');
  var nestedPath = relativePath.split('/').length > 4 ? relativePath.split('/').slice(3,-1).join('/') + '/' : '';
  var stepsPath = basePath + "/acceptance/steps/";
  var fileName =relativePath.split('/').slice(-1)[0].split('.')[0]; //remove extension
  var head = [
    "import Ember from 'ember';",
    this.getTestFrameworkImport(),
    "import yadda from '" + basePath + "/helpers/yadda';",
    "import * as library from '" + stepsPath + nestedPath + fileName + "-steps';",
    "import startApp from '" + basePath + "/helpers/start-app';",
    "",
    this.getTestFeature(),
    "",
    "testFeature("
  ].join('\n');
  var foot = ');';
  return head + JSON.stringify(feature, null, 2) + foot;
};
FeatureParser.prototype.getDestFilePath = function (relativePath) {
  var ext = path.extname(relativePath);
  if(ext === '.feature' || ext === '.spec' || ext === '.specifiation') {
    return relativePath.replace(ext, '-test.js');
  }
  return null;
};
FeatureParser.prototype.getTestFrameworkImport = function() {
  switch (this.testFramework) {
    case 'mocha':
      return 'import { afterEach, beforeEach, describe, it } from \'mocha\';';
    default: // qunit
      return 'import { module, test } from \'qunit\';';
  }
};
FeatureParser.prototype.getTestFeature = function() {
  var testFeature;
  switch (this.testFramework) {
    case 'mocha':
      testFeature = [
        "function testFeature(feature) {",
        "  describe(`Feature: ${feature.title}`, () => {",
        "    beforeEach(function() {",
        "      this.application = startApp();",
        "    });",
        "    afterEach(function() {",
        "      Ember.run(this.application, 'destroy');",
        "    });",
        "    ",
        "    feature.scenarios.forEach(function(scenario) {",
        "      it(`Scenario: ${scenario.title}`, function() {",
        "        return new Ember.RSVP.Promise(function(resolve) { yadda.Yadda(library.default(), this).yadda(scenario.steps, { ctx: {} }, resolve); });",
        "      });",
        "    });",
        "  });",
        "};"
      ];
      break;
    default: // qunit
      testFeature = [
        "function testFeature(feature) {",
        "  module(`Feature: ${feature.title}`, {",
        "    beforeEach: function() {",
        "      this.application = startApp();",
        "    },",
        "    afterEach: function() {",
        "      Ember.run(this.application, 'destroy');",
        "    }",
        "  });",

        "  feature.scenarios.forEach(function(scenario) {",
        "    test(`Scenario: ${scenario.title}`, function(assert) {",
        "      expect(scenario.steps.length);",
        "      return new Ember.RSVP.Promise(function (resolve) { yadda.Yadda(library.default(assert), this).yadda(scenario.steps, { ctx: {} }, resolve); });",
        "    });",
        "  });",
        "};"
      ];
  }
  return testFeature.join('\n');
};

module.exports = {
  name: 'ember-cli-yadda',
  getTestFramework: function() {
    var packages = Object.keys(this.project.addonPackages);
    if (packages.indexOf('ember-cli-mocha') > -1) {
      return 'mocha';
    } else {
      return 'qunit';
    }
  },
  setupPreprocessorRegistry: function(type, registry) {
    var testFramework = this.getTestFramework();
    registry.add('js', {
      name: 'ember-cli-yadda',
      ext: ['feature', 'spec', 'specification'],
      toTree: function(tree, inputPath, outputPath) {
        return new FeatureParser(tree, testFramework);
      }
    });
  },
  blueprintsPath: function() {
    return path.join(__dirname, 'blueprints', this.getTestFramework());
  },
  included: function(app) {
    this._super.included(app);
    app.import(app.bowerDirectory + '/yadda/dist/yadda-0.15.4.js', { type: 'test' });
  },
  isDevelopingAddon: function() {
   return true;
  }
};

#!/usr/bin/env node
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const program = require('commander');
const sequitur = require('./sequitur.js');
var compressjs = require('compressjs');


const Rule = sequitur.Rule;
const Symbol = sequitur.Symbol;

var digramIndex = sequitur.digramIndex;

// print the rules out

var ruleSet;
var outputArray;
var lineLength;

program
  .version('0.0.1')
  .description('A DNA Compression Program')
  .option('-t, --type <path>', 'Input File for Decoding', String)
  .option('-i, --input <path>', 'Input File for Decoding', String)
  .option('-c, --code <path>', 'Input Code for Encoding', String)
  .option('-o, --output <path>', 'Output File for Encoding', String)
  .option('-a, --algorithm <path>', 'Type of Algorithm', String)
  .parse(process.argv);

// console.log(dna);
// console.log(start(dna));
if (program.input && program.output) {
  if (program.algorithm == "huffman") {
    let inputData = fs.readFileSync(program.input);
    let wstream, outputData;

    if (program.type == "e") {
      console.log('Huffman Encoding', program.input, inputData);
      wstream = fs.createWriteStream(program.output + "_compressed");
      outputData = compressjs.Huffman.compressFile(inputData);
    } else if (program.type == "d") {
      console.log('Huffman Decoding', program.input);
      wstream = fs.createWriteStream(program.output + "_decompressed");
      outputData = compressjs.Huffman.decompressFile(inputData);
    }

    wstream.write(new Buffer(outputData));
    wstream.end();
  } else if (program.algorithm == "sequitur") {

    let wstream, wcstream, codeArray, codeData, inputData, outputArray, outputData;
    let c_data, c_code;

    if (program.type == "e" && program.code) {
      console.log('Sequitur Compressing using Code:' + program.code + ' on Input:' + program.input);
      wstream = fs.createWriteStream(program.output + '_' + program.code + '_compressed');
      inputData = fs.readFileSync(program.input).toString();
      codeData = fs.readFileSync(program.code);
      codeData = new Buffer(compressjs.Huffman.decompressFile(codeData)).toString();
      outputData = encode(codeData, inputData) + ' ';
      
      wstream.write(new Buffer(compressjs.Huffman.compressFile(new Buffer(outputData))));
      wstream.end();
    } else if (program.type == "e") {
      console.log('Sequitur Compressing on Input:' + program.input);
      wstream = fs.createWriteStream(program.output + '_data');
      wcstream = fs.createWriteStream(program.output + '_code');
      inputData = fs.readFileSync(program.input);
      outputArray = start(inputData.toString());

      wstream.write(new Buffer(compressjs.Huffman.compressFile(new Buffer(outputArray.shift()))));
      wstream.end();

      wcstream.write(new Buffer(compressjs.Huffman.compressFile(new Buffer(outputArray.join('\n')))));
      wcstream.end();

    } else if (program.type == "d" && program.code) {
      console.log('Sequitur Decoding using Code:' + program.code + ' on Input:' + program.input);
      wstream = fs.createWriteStream(program.output + '_decompressed');
      inputData = fs.readFileSync(program.input);
      inputData = new Buffer(compressjs.Huffman.decompressFile(inputData)).toString();
      console.log(inputData);

      codeData = fs.readFileSync(program.code);
      codeData = new Buffer(compressjs.Huffman.decompressFile(codeData)).toString().split('\n');
      outputData = decode(codeData, ' ' + inputData);
      wstream.write(new Buffer(outputData));
      wstream.end();
    }
  }
}



// Helper

function encode(code, data) {
  code = code.split('\n');
  data = data.split('').join(' ');
  // console.log(code, data);
  var hasReplace = true;

  while (hasReplace) {
    hasReplace = false;
    for (let i = 0; i < code.length; i++) {
      hasReplace = false;
      if (code[i].length) {
        // console.log(i + 1, code[i]);
        hasReplace = !!data.indexOf(code[i]);
        data = data.replace(new RegExp(code[i], 'g'), (i + 1) + ' ');
        // console.log(data);
      }
    }
  }

  return data;
}

function decode(code, data) {
  for (let i = 0; i < code.length; i++) {
    let currCode = code[i].split(' ');
    // console.log(i+1, reduceCode(currCode, code));
    // console.log('before', data);
    data = data.replace(new RegExp(' ' + (i + 1) + ' ', 'g'), ' ' + reduceCode(currCode, code) + ' ');
    data = data.replace(new RegExp(' ' + (i + 1) + ' ', 'g'), ' ' + reduceCode(currCode, code) + ' ');
    // console.log('after', data);
  }
  return data.split(' ').join('');
}

function reduceCode(currCode, code) {
  var sub = "";
  for (let i = 0; i < currCode.length; i++) {
    if (isNaN(currCode[i])) {
      sub += currCode[i];
      // console.log('simple', sub);
    } else if (currCode[i].length) {
      // console.log('complex', currCode[i], code[currCode[i]-1])
      sub += reduceCode(code[currCode[i] - 1].split(' '), code);
      // console.log('finished complex', sub);
    }
  }
  return sub;
}


function printRule(rule) {
  for (var symbol = rule.first(); !symbol.isGuard(); symbol = symbol.getNext()) {
    if (symbol.getRule()) {
      var ruleNumber;

      if (ruleSet[symbol.getRule().getNumber()] == symbol.getRule()) {
        ruleNumber = symbol.getRule().getNumber();
      } else {
        ruleNumber = ruleSet.length;
        symbol.getRule().setNumber(ruleSet.length);
        ruleSet.push(symbol.getRule());
      }

      outputArray.push(ruleNumber + ' ');
      lineLength += (ruleNumber + ' ').length;
    } else {
      outputArray.push(printTerminal(symbol.value()));
      outputArray.push(' ');
      lineLength += 2;
    }
  }
}

function printTerminal(value) {
  if (value == ' ') {
    //    return '\u2423'; // open box (typographic blank indicator).
    return '_'; // open box (typographic blank indicator).
  } else if (value == '\n') {
    return '&crarr;';
  } else if (value == '\t') {
    return '&#8677;';
  } else if (value == '\\' ||
    value == '(' ||
    value == ')' ||
    value == '_' ||
    value.match(/[0-9]/)) {
    return ('\\' + symbol.value());
  } else {
    return value;
  }
}

function printRuleExpansion(rule) {
  for (var symbol = rule.first(); !symbol.isGuard(); symbol = symbol.getNext()) {
    if (symbol.getRule()) {
      printRuleExpansion(symbol.getRule());
    } else {
      outputArray.push(printTerminal(symbol.value()));
    }
  }
}

function printGrammar(S) {
  outputArray = [];
  ruleSet = [];
  ruleSet[0] = S;

  for (var i = 0; ruleSet[i]; i++) {
    // outputArray.push(i + " &rarr; ");
    // outputArray.push(i + ': ');
    lineLength = (i + '   ').length;
    printRule(ruleSet[i]);

    // if (i > 0) {
    //   // for (var j = lineLength; j < 50; j++) {
    //   //   outputArray.push('&nbsp;');
    //   // }
    //   printRuleExpansion(ruleSet[i]);
    // }
    outputArray.push('\n');
  }

  return outputArray.join('').split('\n');
  // return outputArray;
}

function start(seq) {
  digramIndex = {};
  var S = new Rule();
  var input = seq.split('');

  if (input.length) {
    S.last().insertAfter(new Symbol(input.shift()));
  }

  while (input.length) {
    S.last().insertAfter(new Symbol(input.shift()));
    S.last().getPrev().check();
  }
  return printGrammar(S);
}

function printHash() {
  var hash = '';
  for (var key in digramIndex) {
    hash += key + ': ' + digramIndex[key] + '\n';
  }
}
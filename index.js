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

var sfinal = '1 2 A 3 4 2 5 6 7 8 9 10 11 12 13 14 15 16 11 17 18 19 20 21 22 23 13 24 25 14 26 27 28 29 30 31 32 33 25 34 27 3 21 6 35 36 6 37 12 27 38 10 39 40 1 41 42 21 43 36 11 6 42 44 45 39 29 4 46 27 47 41 31 48 1 49 36 50 13 21 51 36 17 52 53 54 55 5 43 12 35 20 56 23 46 36 57 51 56 21 47 9 52 17 25 58 59 46 30 60 46 55 46 59 10 61 36 62 34 63 64 65 31 10 58 22 43 T 48 55 T 66 18 T 67 68 69 66 T 64 70 55 71 50 72 67 49 69 16 21 40 63 70 58 73 74 74 49 75 T 76 61 46 29 73 61 77 78 G 79 32 6 48 T 57 T 46 78 29 21 3 80 69 45 20 29 63 81 51 29 12 82 59 51 58 79 54 33 38 83 71 84 41 83 46 65 61 84 16 85 61 12 65 49 10 86 48 58 71 68 66 50 87 49 60 61 62 84 T 27 88 15 32 89 79 29 87 34 46 76 T 60 41 90 81 75 91 77 2 0 83 89 70 82 86 6 26 16 50 71 92 36 80 89 T 91 90 1 46 88 80 23 41 49 85 T 21 19 34 37 88 T 89 43 41 23 83 28 72 70 23 34 17 23 70 46 46 80 53 48 35 T 84 46 44 G A';
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
      console.log('Huffman Encoding', program.input);
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

    if (program.type == "e" && program.code) {
      console.log('Sequitur Compressing using Code:' + program.code + ' on Input:' + program.input);
      wstream = fs.createWriteStream(program.output + '_' + program.code + '_compressed');
      inputData = fs.readFileSync(program.input).toString();
      codeData = fs.readFileSync(program.code).toString();
      outputData = encode(codeData, inputData) + ' ';
      wstream.write(new Buffer(outputData));
      wstream.end();
    } else if (program.type == "e") {
      wstream = fs.createWriteStream(program.output + '_data');
      wcstream = fs.createWriteStream(program.output + '_code');
      inputData = fs.readFileSync(program.input);
      outputArray = start(inputData.toString());
      wstream.write(new Buffer(outputArray.shift()));
      wstream.end();

      wcstream.write(new Buffer(outputArray.join('\n')));
      wcstream.end();
      
    } else if (program.type == "d" && program.code) {
      console.log('Sequitur Decoding using Code:' + program.code + ' on Input:' + program.input);
      wstream = fs.createWriteStream(program.output + '_decompressed');
      codeData = fs.readFileSync(program.code).toString().split('\n');
      outputData = decode(codeData, ' ' + inputData);
      console.log(outputData);
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
      if(code[i].length){
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
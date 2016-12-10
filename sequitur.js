function Rule() {
  // the guard node in the linked list of symbols that make up the rule
  // It points forward to the first symbol in the rule, and backwards
  // to the last symbol in the rule. Its own value points to the rule data 
  // structure, so that symbols can find out which rule they're in

  this.guard = new Symbol(this);
  this.guard.join(this.guard);

  //  referenceCount keeps track of the number of times the rule is used in the grammar
  this.referenceCount = 0;

  // this is just for numbering the rules nicely for printing; it's
  // not essential for the algorithm
  this.number = 0;

  this.uniqueNumber = Rule.uniqueRuleNumber++;
};

Rule.uniqueRuleNumber = 1;

Rule.prototype.first = function () {
  return this.guard.getNext();
}

Rule.prototype.last = function () {
  return this.guard.getPrev();
}

Rule.prototype.incrementReferenceCount = function () {
  this.referenceCount++;
};

Rule.prototype.decrementReferenceCount = function () {
  this.referenceCount--;
};

Rule.prototype.getReferenceCount = function () {
  return this.referenceCount;
};

Rule.prototype.setNumber = function (i) {
  this.number = i;
};

Rule.prototype.getNumber = function () {
  return this.number;
};


var digramIndex = {};

function Symbol(value) {
  this.next = null;
  this.prev = null;
  this.terminal = null;
  this.rule = null;

  // initializes a new symbol. If it is non-terminal, increments the reference
  // count of the corresponding rule

  if (typeof (value) == 'string') {
    this.terminal = value;
  } else if (typeof (value) == 'object') {
    if (value.terminal) {
      this.terminal = value.terminal;
    } else if (value.rule) {
      this.rule = value.rule;
      this.rule.incrementReferenceCount();
    } else {
      this.rule = value;
      this.rule.incrementReferenceCount();
    }
  } else {
    console.log('Did not recognize ' + value);
  }
};

/**
 * links two symbols together, removing any old digram from the hash table.
 */
Symbol.prototype.join = function (right) {

  if (this.next) {
    this.deleteDigram();

    // This is to deal with triples, where we only record the second
    // pair of the overlapping digrams. When we delete the second pair,
    // we insert the first pair into the hash table so that we don't
    // forget about it.  e.g. abbbabcbb

    if (right.prev && right.next &&
      right.value() == right.prev.value() &&
      right.value() == right.next.value()) {
      digramIndex[right.hashValue()] = right;
    }

    if (this.prev && this.next &&
      this.value() == this.next.value() &&
      this.value() == this.prev.value()) {
      digramIndex[this.hashValue()] = this;
    }
  }
  this.next = right;
  right.prev = this;
};

/**
 * cleans up for symbol deletion: removes hash table entry and decrements
 * rule reference count.
 */
Symbol.prototype.delete = function () {
  this.prev.join(this.next);
  if (!this.isGuard()) {
    this.deleteDigram();
    if (this.getRule()) {
      this.getRule().decrementReferenceCount();
    }
  }
};

/**
 * Removes the digram from the hash table
 */
Symbol.prototype.deleteDigram = function () {
  if (this.isGuard() || this.next.isGuard()) {
    return;
  }

  if (digramIndex[this.hashValue()] == this) {
    digramIndex[this.hashValue()] = null;
  }
};

/**
 * Inserts a symbol after this one.
 */
Symbol.prototype.insertAfter = function (symbol) {
  symbol.join(this.next);
  this.join(symbol);
};

/**
 * Returns true if this is the guard node marking the beginning and end of a
 * rule.
 */
Symbol.prototype.isGuard = function () {
  return this.getRule() && this.getRule().first().getPrev() == this;
};

/**
 * getRule() returns rule if a symbol is non-terminal, and null otherwise.
 */
Symbol.prototype.getRule = function () {
  return this.rule;
};

Symbol.prototype.getNext = function () {
  return this.next;
};

Symbol.prototype.getPrev = function () {
  return this.prev;
};

Symbol.prototype.getTerminal = function () {
  return this.terminal;
};

/**
 * Checks a new digram. If it appears elsewhere, deals with it by calling
 * match(), otherwise inserts it into the hash table.
 */
Symbol.prototype.check = function (isNew) {
  if(isNew){
    console.log("==");
  }
  
  if (this.isGuard() || this.next.isGuard()) {
    console.log("Check isGuard");
    return 0;
  }

  var match = digramIndex[this.hashValue()];
  console.log("CHECK:", this.complementHashValue());
  if (!match) {
    console.log("Check No Match", this.hashValue());
    digramIndex[this.hashValue()] = this;
    console.log("No Match Add Digram:", printDigrams());
    return false;
  }

  if (match.getNext() != this) {
    console.log("Check Match:", match.hashValue());
    this.processMatch(match);
  }
  return true;
};


/**
 * This symbol is the last reference to its rule. It is deleted, and the
 * contents of the rule substituted in its place.
 */
Symbol.prototype.expand = function () {
  var left = this.getPrev();
  var right = this.getNext();
  var first = this.getRule().first();
  var last = this.getRule().last();

  if (digramIndex[this.hashValue()] == this) {
    digramIndex[this.hashValue()] = null;
  }

  left.join(first);
  last.join(right);

  digramIndex[last.hashValue()] = last;
};

/**
 * Replace a digram with a non-terminal
 */
Symbol.prototype.substitute = function (rule, out) {
  console.log("**")
  console.log("Subsitute " + out, this.hashValue() + " with " + rule.uniqueNumber);
  var prev = this.prev;

  prev.getNext().delete();
  prev.getNext().delete();

  prev.insertAfter(new Symbol(rule));

  console.log("Prev Check");
  if (!prev.check()) {
    console.log("Next Check");
    prev.next.check();
  }
};

/**
 * Deal with a matching digram.
 */
Symbol.prototype.processMatch = function (match) {
  var rule;

  // reuse an existing rule
  if (match.getPrev().isGuard() &&
    match.getNext().getNext().isGuard()) {
      
    rule = match.getPrev().getRule();
    console.log("Process: Existing Rule " + rule.uniqueNumber + ":", printGrammar(rule));
    this.substitute(rule, "This");
  } else {
    // create a new rule
    rule = new Rule();

    rule.last().insertAfter(new Symbol(this));
    rule.last().insertAfter(new Symbol(this.getNext()));
    console.log("Process: New Rule " + rule.uniqueNumber + ":", printGrammar(rule));


    match.substitute(rule, "Match");
    this.substitute(rule, "This");

    digramIndex[rule.first().hashValue()] = rule.first();
  }

  // check for an underused rule
  if (rule.first().getRule() &&
    rule.first().getRule().getReferenceCount() == 1) {
    rule.first().expand();
  }
}

Symbol.prototype.value = function () {
  return this.rule ? this.rule : this.terminal;
};

Symbol.prototype.stringValue = function () {
  if (this.getRule()) {
    return 'rule:' + this.rule.uniqueNumber;
  } else {
    return this.terminal;
  }
};

Symbol.prototype.hashValue = function () {
  return this.stringValue() + '+' +
    this.next.stringValue();
};

Symbol.prototype.complementHashValue = function () {
  var n = ['A', 'T', 'C', 'G'];
  var c = ['T', 'A', 'G', 'C'];

  function getValue(v){
    var indexN = n.indexOf(v.stringValue());
    var indexC = v.stringValue().indexOf("'");

    if(indexN !== -1){
      return c[indexN];
    }
    if(indexC !== -1) {
      return v.stringValue().split("'").join('');
    } else {
      return v.stringValue() + "'";
    }
  }

  return getValue(this.next) + '+' +
    getValue(this);
};

var outputArray = [];
//PRINT
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

function printDigrams(){
  var output = "";
  var keys = Object.keys(digramIndex);
  for(var i = 0; i < keys.length; i ++){
    output += "{"+keys[i]+"},"
  }
  return output;
}

module.exports.Rule = Rule;
module.exports.Symbol = Symbol;
module.exports.digramIndex = digramIndex;
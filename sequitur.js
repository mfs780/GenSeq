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
  this.isComp = false;

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
  this.isComp = false;

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
  // if(this.terminal && right.terminal){
  //   console.log('['+this.terminal+','+right.terminal+']')
  // }
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
Symbol.prototype.check = function () {
  if (this.isGuard() || this.next.isGuard()) {
    return 0;
  }

  var thisVal = this.isComp ? this.stringValue() + "'" : this.stringValue();
  var nextVal = this.next.isComp ? this.next.stringValue() + "'" : this.next.stringValue();
  console.log('check', thisVal + '+' + nextVal);
  var match = digramIndex[this.hashValue()];
  var matchi = digramIndex[this.reverseComplementValue()];


  if (!match && !matchi) {
    digramIndex[this.hashValue()] = this;
    return false;
  }

  if (match && match.getNext() != this) {
    console.log('Repeat Match', match.value() + "+" +  match.next.value());
    this.processMatch(match, false);
  } else if(matchi.getNext() != this){
    console.log('Comp Match', matchi.value() + "+" +  matchi.next.value());
    this.processMatch(matchi, true);
  } else {
    console.log('bri');
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
Symbol.prototype.substitute = function (rule, isComp) {
  var prev = this.prev;

  prev.getNext().delete();
  prev.getNext().delete();
  var newSymbol = new Symbol(rule);
  prev.insertAfter(newSymbol);

  if(isComp){
    newSymbol.isComp = true;
    console.log('replace with rule', newSymbol.getRule().uniqueNumber + "'");
  } else {
    console.log('replace with rule', newSymbol.getRule().uniqueNumber);
  }
  console.log('Prev Check', prev.terminal + prev.next.terminal);
  if (!prev.check()) {
    console.log('Next Check', prev.next.terminal + prev.next.next.terminal);
    prev.next.check();
  }
};

/**
 * Deal with a matching digram.
 */
Symbol.prototype.processMatch = function (match, isComp) {
  var rule;

  // reuse an existing rule
  if (match.getPrev().isGuard() &&
    match.getNext().getNext().isGuard()) {
    rule = match.getPrev().getRule();
    console.log('Existing Rule', printRule(rule));
    this.substitute(rule, isComp);
  } else {
    // create a new rule
    rule = new Rule();

    if(isComp){
      rule.last().insertAfter(new Symbol(match));
      rule.last().insertAfter(new Symbol(match.getNext()));
      match.substitute(rule, false);
      this.substitute(rule, true);
    } else {
      rule.last().insertAfter(new Symbol(this));
      rule.last().insertAfter(new Symbol(this.getNext()));
      match.substitute(rule);
      this.substitute(rule);
    }
      
    console.log('New Rule', rule.uniqueNumber + ":", printRule(rule));
    console.log('Match Subsitute', isComp);

    digramIndex[rule.first().hashValue()] = rule.first();
  }

  // check for an underused rule
  console.log('Check Unused');
  if (rule.first().getRule() &&
    rule.first().getRule().getReferenceCount() == 10) {
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

Symbol.prototype.reverseComplementValue = function () {
  var getComplement = function(value){
    var v = ['A', 'T', 'C', 'G'];
    var c = ['T', 'A', 'G', 'C'];
    
    var s = v.indexOf(value.stringValue());
    if(s !== -1){
      s = c[s];
    } else {
      if(value.isComp){
        s = value.stringValue();
      } else {
        s = value.stringValue() + "'";
      }
    }
    return s;
  }
  // console.log('comp', getComplement(this.next) + '+' + getComplement(this));
  return getComplement(this.next) + '+' + getComplement(this);
}

module.exports.Rule = Rule;
module.exports.Symbol = Symbol;
module.exports.digramIndex = digramIndex;


var ruleSet = [];

/**
 * @param {Rule} rule
 */
function printRule(rule) {
  var output = "";
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
      if(symbol.isComp){
        output += ruleNumber + "'" + ' ';
      } else {
        output += ruleNumber + ' ';
      }
      
      // lineLength += (ruleNumber + ' ').length;
    } else {
      output += printTerminal(symbol.value());
      output += ' ';
      // lineLength += 2;
    }
  }
  return output;
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
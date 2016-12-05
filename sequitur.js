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
Symbol.prototype.check = function () {
  if (this.isGuard() || this.next.isGuard()) {
    return 0;
  }

  var match = digramIndex[this.hashValue()];
  if (!match) {
    digramIndex[this.hashValue()] = this;
    return false;
  }

  if (match.getNext() != this) {
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
Symbol.prototype.substitute = function (rule) {
  var prev = this.prev;

  prev.getNext().delete();
  prev.getNext().delete();

  prev.insertAfter(new Symbol(rule));

  if (!prev.check()) {
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
    this.substitute(rule);
  } else {
    // create a new rule
    rule = new Rule();

    rule.last().insertAfter(new Symbol(this));
    rule.last().insertAfter(new Symbol(this.getNext()));

    match.substitute(rule);
    this.substitute(rule);

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

module.exports.Rule = Rule;
module.exports.Symbol = Symbol;
module.exports.digramIndex = digramIndex;
/*********************************
 * Symbols for Basic Mathematics
 ********************************/
class DigitGroupingChar extends MQSymbol {
  finalizeTree (opts, dir) { this.sharedSiblingMethod(opts, dir) };
  siblingDeleted (opts, dir) { this.sharedSiblingMethod(opts, dir) };
  siblingCreated (opts, dir) { this.sharedSiblingMethod(opts, dir) };
  
  sharedSiblingMethod (opts, dir) {
    // don't try to fix digit grouping if the sibling to my right changed (dir === R or
    // undefined) and it's now a DigitGroupingChar, it will try to fix grouping
    if (dir !== L && this[R] instanceof DigitGroupingChar) return;
    this.fixDigitGrouping(opts);
  };

  fixDigitGrouping (opts) {
    if (!opts.enableDigitGrouping) return;

    var left = this;
    var right = this;

    var spacesFound = 0;
    var dots = [];

    var SPACE = '\\ ';
    var DOT = '.';

    // traverse left as far as possible (starting at this char)
    var node = left;
    do {
      if (/^[0-9]$/.test(node.ctrlSeq)) {
        left = node
      } else if (node.ctrlSeq === SPACE) {
        left = node
        spacesFound += 1;
      } else if (node.ctrlSeq === DOT) {
        left = node
        dots.push(node);
      } else {
        break;
      }
    } while (node = left[L]);

    // traverse right as far as possible (starting to right of this char)
    while (node = right[R]) {
      if (/^[0-9]$/.test(node.ctrlSeq)) {
        right = node
      } else if (node.ctrlSeq === SPACE) {
        right = node
        spacesFound += 1;
      } else if (node.ctrlSeq === DOT) {
        right = node
        dots.push(node);
      } else {
        break;
      }
    }

    // trim the leading spaces
    while (right !== left && left.ctrlSeq === SPACE) {
      left = left[R];
      spacesFound -= 1;
    }

    // trim the trailing spaces
    while (right !== left && right.ctrlSeq === SPACE) {
      right = right[L];
      spacesFound -= 1;
    }

    // happens when you only have a space
    if (left === right && left.ctrlSeq === SPACE) return;

    var disableFormatting = spacesFound > 0 || dots.length > 1;
    if (disableFormatting) {
      this.removeGroupingBetween(left, right);
    } else if (dots[0]) {
      if (dots[0] !== left) {
        this.addGroupingBetween(dots[0][L], left);
      }
      if (dots[0] !== right) {
        // we do not show grouping to the right of a decimal place #yet
        this.removeGroupingBetween(dots[0][R], right);
      }
    } else {
      this.addGroupingBetween(right, left);
    }
  };

  removeGroupingBetween (left, right) {
    var node = left;
    do {
      node.setGroupingClass(undefined);
      if (node === right) break;
    } while (node = node[R]);
  };

  addGroupingBetween (start, end) {
    var node = start;
    var count = 0;

    var totalDigits = 0;
    var node = start;
    while (node) {
      totalDigits += 1;

      if (node === end) break;
      node = node[L];
    }

    var numDigitsInFirstGroup = totalDigits % 3;
    if (numDigitsInFirstGroup === 0) numDigitsInFirstGroup = 3;

    var node = start;
    while (node) {
      count += 1;

      var cls = undefined;

      // only do grouping if we have at least 4 numbers
      if (totalDigits >= 4) {
        if (count === totalDigits) {
          cls = 'mq-group-leading-' + numDigitsInFirstGroup;
        } else if (count % 3 === 0) {
          if (count !== totalDigits) {
            cls = 'mq-group-start'
          }
        }

        if (!cls) {
          cls = 'mq-group-other'
        }
      }

      node.setGroupingClass(cls);

      if (node === end) break;
      node = node[L];
    }
  };

  setGroupingClass (cls) {
    // nothing changed (either class is the same or it's still undefined)
    if (this._groupingClass === cls) return;

    // remove existing class
    if (this._groupingClass) this.jQ.removeClass(this._groupingClass);

    // add new class
    if (cls) this.jQ.addClass(cls);

    // cache the groupingClass
    this._groupingClass = cls;
  }
};

class Digit extends DigitGroupingChar {
  constructor (ch, html, mathspeak) {
    super(ch, '<span class="mq-digit">'+(html || ch)+'</span>', undefined, mathspeak);
  };

  createLeftOf (cursor) {
    if (cursor.options.autoSubscriptNumerals
        && cursor.parent !== cursor.parent.parent.sub
        && ((cursor[L] instanceof Variable && cursor[L].isItalic !== false)
            || (cursor[L] instanceof SupSub
                && cursor[L][L] instanceof Variable
                && cursor[L][L].isItalic !== false))) {
      new LatexCmds._().createLeftOf(cursor);
      super.createLeftOf(cursor);
      cursor.insRightOf(cursor.parent.parent);
    }
    else super.createLeftOf(cursor);
  };
  mathspeak (opts) {
    if (opts && opts.createdLeftOf) {
      var cursor = opts.createdLeftOf;
      if (cursor.options.autoSubscriptNumerals
          && cursor.parent !== cursor.parent.parent.sub
          && ((cursor[L] instanceof Variable && cursor[L].isItalic !== false)
              || (cursor[L] instanceof SupSub
                  && cursor[L][L] instanceof Variable
                  && cursor[L][L].isItalic !== false))) {
        return 'Subscript ' + super.mathspeak() + ' Baseline';
      }
    }
    return super.mathspeak.apply(this, arguments);
  };
}

class Variable extends MQSymbol {
  constructor (ch, html) {
    super(ch, '<var>'+(html || ch)+'</var>');
  };
  text () {
    var text = this.ctrlSeq;
    if (this.isPartOfOperator) {
      if (text[0] == '\\') {
        text = text.slice(1, text.length);
      }
      else if (text[text.length-1] == ' ') {
        text = text.slice (0, -1);
      }
    } else {
      if (this[L] && !(this[L] instanceof Variable)
          && !(this[L] instanceof BinaryOperator)
          && this[L].ctrlSeq !== '\\ ')
        text = '*' + text;
      if (this[R] && !(this[R] instanceof BinaryOperator)
          && !(this[R] instanceof SupSub))
        text += '*';
    }
    return text;
  };
  mathspeak () {
    var text = this.ctrlSeq;
    if (
      this.isPartOfOperator ||
      text.length > 1 ||
      (this.parent && this.parent.parent && this.parent.parent.isTextBlock())
    ) {
      return super.mathspeak();
    } else {
      // Apple voices in VoiceOver (such as Alex, Bruce, and Victoria) do
      // some strange pronunciation given certain expressions,
      // e.g. "y-2" is spoken as "ee minus 2" (as if the y is short).
      // Not an ideal solution, but surrounding non-numeric text blocks with quotation marks works.
      // This bug has been acknowledged by Apple.
      return '"'+text+'"';
    }
  };
};
function bindVariable (ch, html) {
  return () => new Variable(ch, html);
}


Options.prototype.autoCommands = { _maxLength: 0 };
optionProcessors.autoCommands = function(cmds) {
  if (!/^[a-z]+(?: [a-z]+)*$/i.test(cmds)) {
    throw '"'+cmds+'" not a space-delimited list of only letters';
  }
  var list = cmds.split(' '), dict = {}, maxLength = 0;
  for (var i = 0; i < list.length; i += 1) {
    var cmd = list[i];
    if (cmd.length < 2) {
      throw 'autocommand "'+cmd+'" not minimum length of 2';
    }
    if (LatexCmds[cmd] === OperatorName) {
      throw '"' + cmd + '" is a built-in operator name';
    }
    dict[cmd] = 1;
    maxLength = max(maxLength, cmd.length);
  }
  dict._maxLength = maxLength;
  return dict;
};

Options.prototype.autoParenthesizedFunctions = {_maxLength: 0};
optionProcessors.autoParenthesizedFunctions = function (cmds) {
  if (!/^[a-z]+(?: [a-z]+)*$/i.test(cmds)) {
    throw '"'+cmds+'" not a space-delimited list of only letters';
  }
  var list = cmds.split(' '), dict = {}, maxLength = 0;
  for (var i = 0; i < list.length; i += 1) {
    var cmd = list[i];
    if (cmd.length < 2) {
      throw 'autocommand "'+cmd+'" not minimum length of 2';
    }
    dict[cmd] = 1;
    maxLength = max(maxLength, cmd.length);
  }
  dict._maxLength = maxLength;
  return dict;
}

class Letter extends Variable {
  constructor (ch) {
    this.letter = ch;
    return super(ch);
  };
  checkAutoCmds (cursor) {
    //handle autoCommands
    var autoCmds = cursor.options.autoCommands, maxLength = autoCmds._maxLength;
    if (maxLength > 0) {
      // want longest possible autocommand, so join together longest
      // sequence of letters
      var str = '', l = this, i = 0;
      // FIXME: l.ctrlSeq === l.letter checks if first or last in an operator name
      while (l instanceof Letter && l.ctrlSeq === l.letter && i < maxLength) {
        str = l.letter + str, l = l[L], i += 1;
      }
      // check for an autocommand, going thru substrings longest to shortest
      while (str.length) {
        if (autoCmds.hasOwnProperty(str)) {
          for (var i = 1, l = this; i < str.length; i += 1, l = l[L]);
          new Fragment(l, this).remove();
          cursor[L] = l[L];

          var cmd = LatexCmds[str];
          if (cmd.constructor) {
            cmd = new cmd(str);
          } else {
            cmd = cmd(str);
          }

          return cmd.createLeftOf(cursor);
        }
        str = str.slice(1);
      }
    }
  }

  autoParenthesize (cursor) {
    //exit early if already parenthesized
    var right = cursor.parent.ends[R]
    if (right && right instanceof Bracket && right.ctrlSeq === '\\left(') {
      return
    }

    //exit early if in simple subscript
    if (this.isParentSimpleSubscript()) {
      return;
    }

    //handle autoParenthesized functions
    var str = '', l = this, i = 0;

    var autoParenthesizedFunctions = cursor.options.autoParenthesizedFunctions, maxLength = autoParenthesizedFunctions._maxLength;
    var autoOperatorNames = cursor.options.autoOperatorNames
    while (l instanceof Letter && i < maxLength) {
      str = l.letter + str, l = l[L], i += 1;
    }
    // check for an autoParenthesized functions, going thru substrings longest to shortest
    // only allow autoParenthesized functions that are also autoOperatorNames
    while (str.length) {
      if (autoParenthesizedFunctions.hasOwnProperty(str) && autoOperatorNames.hasOwnProperty(str)) {
        return cursor.parent.write(cursor, '(');
      }
      str = str.slice(1);
    }
  }

  createLeftOf (cursor) {
    super.createLeftOf.apply(this, arguments);

    this.checkAutoCmds(cursor);
    this.autoParenthesize(cursor);
  };
  italicize (bool) {
    this.isItalic = bool;
    this.isPartOfOperator = !bool;
    this.jQ.toggleClass('mq-operator-name', !bool);
    return this;
  };
  finalizeTree (opts, dir) {this.sharedSiblingMethod(opts, dir)};
  siblingDeleted (opts, dir) {this.sharedSiblingMethod(opts, dir)};
  siblingCreated (opts, dir) {this.sharedSiblingMethod(opts, dir)};
  
  sharedSiblingMethod (opts, dir) {
    // don't auto-un-italicize if the sibling to my right changed (dir === R or
    // undefined) and it's now a Letter, it will un-italicize everyone
    if (dir !== L && this[R] instanceof Letter) return;
    this.autoUnItalicize(opts);
  };

  autoUnItalicize (opts) {
    var autoOps = opts.autoOperatorNames;
    if (autoOps._maxLength === 0) return;

    //exit early if in simple subscript
    if (this.isParentSimpleSubscript()) {
      return;
    }

    // want longest possible operator names, so join together entire contiguous
    // sequence of letters
    var str = this.letter;
    for (var l = this[L]; l instanceof Letter; l = l[L]) str = l.letter + str;
    for (var r = this[R]; r instanceof Letter; r = r[R]) str += r.letter;

    // removeClass and delete flags from all letters before figuring out
    // which, if any, are part of an operator name
    new Fragment(l[R] || this.parent.ends[L], r[L] || this.parent.ends[R]).each(function(el) {
      el.italicize(true).jQ.removeClass('mq-first mq-last mq-followed-by-supsub');
      el.ctrlSeq = el.letter;
    });

    // check for operator names: at each position from left to right, check
    // substrings from longest to shortest
    outer: for (var i = 0, first = l[R] || this.parent.ends[L]; i < str.length; i += 1, first = first[R]) {
      for (var len = min(autoOps._maxLength, str.length - i); len > 0; len -= 1) {
        var word = str.slice(i, i + len);
        if (autoOps.hasOwnProperty(word)) {
          for (var j = 0, letter = first; j < len; j += 1, letter = letter[R]) {
            letter.italicize(false);
            var last = letter;
          }

          var isBuiltIn = BuiltInOpNames.hasOwnProperty(word);
          first.ctrlSeq = (isBuiltIn ? '\\' : '\\operatorname{') + first.ctrlSeq;
          last.ctrlSeq += (isBuiltIn ? ' ' : '}');
          if (TwoWordOpNames.hasOwnProperty(word)) last[L][L][L].jQ.addClass('mq-last');
          if (!this.shouldOmitPadding(first[L])) first.jQ.addClass('mq-first');
          if (!this.shouldOmitPadding(last[R])) {
            if (last[R] instanceof SupSub) {
              var supsub = last[R]; // XXX monkey-patching, but what's the right thing here?
              // Have operatorname-specific code in SupSub? A CSS-like language to style the
              // math tree, but which ignores cursor and selection (which CSS can't)?
              var respace = supsub.siblingCreated = supsub.siblingDeleted = function() {
                supsub.jQ.toggleClass('mq-after-operator-name', !(supsub[R] instanceof Bracket));
              };
              respace();
            }
            else {
              last.jQ.toggleClass('mq-last', !(last[R] instanceof Bracket));
            }
          }

          i += len - 1;
          first = last;
          continue outer;
        }
      }
    }
  };
  shouldOmitPadding(node) {
    // omit padding if no node
    if (!node) return true;

    // do not add padding between letter and '.'
    if (node.ctrlSeq === '.') return true;

    // do not add padding between letter and binary operator. The
    // binary operator already has padding
    if (node instanceof BinaryOperator) return true;

    if (node instanceof SummationNotation) return true;

    return false;
  }
};
var BuiltInOpNames = {}; // the set of operator names like \sin, \cos, etc that
  // are built-into LaTeX, see Section 3.17 of the Short Math Guide: http://tinyurl.com/jm9okjc
  // MathQuill auto-unitalicizes some operator names not in that set, like 'hcf'
  // and 'arsinh', which must be exported as \operatorname{hcf} and
  // \operatorname{arsinh}. Note: over/under line/arrow \lim variants like
  // \varlimsup are not supported
var AutoOpNames = Options.prototype.autoOperatorNames = { _maxLength: 9 }; // the set
  // of operator names that MathQuill auto-unitalicizes by default; overridable
var TwoWordOpNames = { limsup: 1, liminf: 1, projlim: 1, injlim: 1 };
(function() {
  var mostOps = ('arg deg det dim exp gcd hom inf ker lg lim ln log max min sup'
                 + ' limsup liminf injlim projlim Pr').split(' ');
  for (var i = 0; i < mostOps.length; i += 1) {
    BuiltInOpNames[mostOps[i]] = AutoOpNames[mostOps[i]] = 1;
  }

  var builtInTrigs = // why coth but not sech and csch, LaTeX?
    'sin cos tan arcsin arccos arctan sinh cosh tanh sec csc cot coth'.split(' ');
  for (var i = 0; i < builtInTrigs.length; i += 1) {
    BuiltInOpNames[builtInTrigs[i]] = 1;
  }

  var autoTrigs = 'sin cos tan sec cosec csc cotan cot ctg'.split(' ');
  for (var i = 0; i < autoTrigs.length; i += 1) {
    AutoOpNames[autoTrigs[i]] =
    AutoOpNames['arc'+autoTrigs[i]] =
    AutoOpNames[autoTrigs[i]+'h'] =
    AutoOpNames['ar'+autoTrigs[i]+'h'] =
    AutoOpNames['arc'+autoTrigs[i]+'h'] = 1;
  }

  // compat with some of the nonstandard LaTeX exported by MathQuill
  // before #247. None of these are real LaTeX commands so, seems safe
  var moreNonstandardOps = 'gcf hcf lcm proj span'.split(' ');
  for (var i = 0; i < moreNonstandardOps.length; i += 1) {
    AutoOpNames[moreNonstandardOps[i]] = 1;
  }
}());

optionProcessors.autoOperatorNames = function(cmds) {
  if(typeof cmds !== 'string') {
    throw '"'+cmds+'" not a space-delimited list';
  }
  if (!/^[a-z\|\-]+(?: [a-z\|\-]+)*$/i.test(cmds)) {
    throw '"'+cmds+'" not a space-delimited list of letters or "|"';
  }
  var list = cmds.split(' '), dict = {}, maxLength = 0;
  for (var i = 0; i < list.length; i += 1) {
    var cmd = list[i];
    if (cmd.length < 2) {
      throw '"'+cmd+'" not minimum length of 2';
    }
    if(cmd.indexOf('|') < 0) { // normal auto operator
      dict[cmd] = cmd;
      maxLength = max(maxLength, cmd.length);
    }
    else { // this item has a speech-friendly alternative
      var cmdArray = cmd.split('|');
      if(cmdArray.length > 2) {
        throw '"'+cmd+'" has more than 1 mathspeak delimiter';
      }
      if (cmdArray[0].length < 2) {
        throw '"'+cmd[0]+'" not minimum length of 2';
      }
      dict[cmdArray[0]] = cmdArray[1].replace(/-/g, ' '); // convert dashes to spaces for the sake of speech
      maxLength = max(maxLength, cmdArray[0].length);
    }
  }
  dict._maxLength = maxLength;
  return dict;
};
class OperatorName extends MQSymbol {
  constructor (fn) {
    super(fn);
  };
  createLeftOf (cursor) {
    var fn = this.ctrlSeq;
    for (var i = 0; i < fn.length; i += 1) {
      new Letter(fn.charAt(i)).createLeftOf(cursor);
    }
  };
  parser () {
    var fn = this.ctrlSeq;
    var block = new MathBlock();
    for (var i = 0; i < fn.length; i += 1) {
      new Letter(fn.charAt(i)).adopt(block, block.ends[R], 0);
    }
    return Parser.succeed(block.children());
  };
};
for (var fn in AutoOpNames) if (AutoOpNames.hasOwnProperty(fn)) {
  LatexCmds[fn] = OperatorName;
}
LatexCmds.operatorname = class extends MathCommand {
  createLeftOf () {};
  numBlocks () { return 1; };
  parser () {
    return latexMathParser.block.map(function(b) {
      // Check for the special case of \operatorname{ans}, which has
      // a special html representation
      var isAllLetters = true;
      var str = '';
      var children = b.children();
      children.each(function(child) {
        if (child instanceof Letter) {
          str += child.letter;
        } else {
          isAllLetters = false;
        }
      });
      if (isAllLetters && str === 'ans') return LatexCmds[str](str);
      // In cases other than `ans`, just return the children directly
      return children;
    });
  };
};

LatexCmds.f = class extends Letter {
  constructor() {
    this.letter = 'f';
    super(this.letter);

    this.htmlTemplate = '<var class="mq-f">f</var>';
  };
  italicize (bool) {
    this.jQ.html('f').toggleClass('mq-f', bool);
    return super.italicize.apply(this, arguments);
  };
};

// VanillaSymbol's
LatexCmds[' '] = LatexCmds.space = () => new DigitGroupingChar('\\ ', '<span>&nbsp;</span>', ' ');

LatexCmds['.'] =  () => new DigitGroupingChar('.', '<span class="mq-digit">.</span>', '.')

LatexCmds["'"] = LatexCmds.prime = bindVanillaSymbol("'", '&prime;', 'prime');
LatexCmds['″'] = LatexCmds.dprime = bindVanillaSymbol('″', '&Prime;', 'double prime');

LatexCmds.backslash = bindVanillaSymbol('\\backslash ','\\', 'backslash');
if (!CharCmds['\\']) CharCmds['\\'] = LatexCmds.backslash;

LatexCmds.$ = bindVanillaSymbol('\\$', '$', 'dollar');

LatexCmds.square = bindVanillaSymbol('\\square ', '\u25A1', 'square');
LatexCmds.mid = bindVanillaSymbol('\\mid ', '\u2223', 'mid');

// does not use Symbola font
class NonSymbolaSymbol extends MQSymbol {
  constructor (ch, html) {
    super(ch, '<span class="mq-nonSymbola">'+(html || ch)+'</span>');
  };
};

LatexCmds['@'] = NonSymbolaSymbol;
LatexCmds['&'] = () => new NonSymbolaSymbol('\\&', '&amp;', 'and');
LatexCmds['%'] = class extends NonSymbolaSymbol {
  constructor() {
    super('\\%', '%', 'percent');
  };
  parser () {
    var optWhitespace = Parser.optWhitespace;
    var string = Parser.string;

    // Parse `\%\operatorname{of}` as special `percentof` node so that
    // it will be serialized properly and deleted as a unit.
    return optWhitespace
      .then(
        string('\\operatorname{of}')
        .map(function () {
          return LatexCmds.percentof();
        })
      ).or(super.parser())
    ;
  }
};

LatexCmds['∥'] = LatexCmds.parallel =
  bindVanillaSymbol('\\parallel ', '&#x2225;', 'parallel');

LatexCmds['∦'] = LatexCmds.nparallel =
  bindVanillaSymbol('\\nparallel ', '&#x2226;', 'not parallel');

LatexCmds['⟂'] = LatexCmds.perp =
  bindVanillaSymbol('\\perp ', '&#x27C2;', 'perpendicular');

//the following are all Greek to me, but this helped a lot: http://www.ams.org/STIX/ion/stixsig03.html

//lowercase Greek letter variables
LatexCmds.alpha =
LatexCmds.beta =
LatexCmds.gamma =
LatexCmds.delta =
LatexCmds.zeta =
LatexCmds.eta =
LatexCmds.theta =
LatexCmds.iota =
LatexCmds.kappa =
LatexCmds.mu =
LatexCmds.nu =
LatexCmds.xi =
LatexCmds.rho =
LatexCmds.sigma =
LatexCmds.tau =
LatexCmds.chi =
LatexCmds.psi =
LatexCmds.omega = (latex) => new Variable('\\'+latex+' ','&'+latex+';');

//why can't anybody FUCKING agree on these
LatexCmds.phi = //W3C or Unicode?
  bindVariable('\\phi ','&#981;', 'phi');

LatexCmds.phiv = //Elsevier and 9573-13
LatexCmds.varphi = //AMS and LaTeX
  bindVariable('\\varphi ','&phi;', 'phi');

LatexCmds.epsilon = //W3C or Unicode?
  bindVariable('\\epsilon ','&#1013;', 'epsilon');

LatexCmds.epsiv = //Elsevier and 9573-13
LatexCmds.varepsilon = //AMS and LaTeX
  bindVariable('\\varepsilon ','&epsilon;', 'epsilon');

LatexCmds.piv = //W3C/Unicode and Elsevier and 9573-13
LatexCmds.varpi = //AMS and LaTeX
  bindVariable('\\varpi ','&piv;', 'piv');

LatexCmds.sigmaf = //W3C/Unicode
LatexCmds.sigmav = //Elsevier
LatexCmds.varsigma = //LaTeX
  bindVariable('\\varsigma ','&sigmaf;', 'sigma');

LatexCmds.thetav = //Elsevier and 9573-13
LatexCmds.vartheta = //AMS and LaTeX
LatexCmds.thetasym = //W3C/Unicode
  bindVariable('\\vartheta ','&thetasym;', 'theta');

LatexCmds.upsilon = //AMS and LaTeX and W3C/Unicode
LatexCmds.upsi = //Elsevier and 9573-13
  bindVariable('\\upsilon ','&upsilon;', 'upsilon');

//these aren't even mentioned in the HTML character entity references
LatexCmds.gammad = //Elsevier
LatexCmds.Gammad = //9573-13 -- WTF, right? I dunno if this was a typo in the reference (see above)
LatexCmds.digamma = //LaTeX
  bindVariable('\\digamma ','&#989;', 'gamma');

LatexCmds.kappav = //Elsevier
LatexCmds.varkappa = //AMS and LaTeX
  bindVariable('\\varkappa ','&#1008;', 'kappa');

LatexCmds.rhov = //Elsevier and 9573-13
LatexCmds.varrho = //AMS and LaTeX
  bindVariable('\\varrho ','&#1009;', 'rho');

//Greek constants, look best in non-italicized Times New Roman
LatexCmds.pi = LatexCmds['π'] = () => new NonSymbolaSymbol('\\pi ','&pi;', 'pi');
LatexCmds.lambda = () => new NonSymbolaSymbol('\\lambda ','&lambda;', 'lambda');

//uppercase greek letters

LatexCmds.Upsilon = //LaTeX
LatexCmds.Upsi = //Elsevier and 9573-13
LatexCmds.upsih = //W3C/Unicode "upsilon with hook"
LatexCmds.Upsih = //'cos it makes sense to me
  () => new MQSymbol('\\Upsilon ','<var style="font-family: serif">&upsih;</var>', 'capital upsilon'); //Symbola's 'upsilon with a hook' is a capital Y without hooks :(

//other symbols with the same LaTeX command and HTML character entity reference
LatexCmds.Gamma =
LatexCmds.Delta =
LatexCmds.Theta =
LatexCmds.Lambda =
LatexCmds.Xi =
LatexCmds.Pi =
LatexCmds.Sigma =
LatexCmds.Phi =
LatexCmds.Psi =
LatexCmds.Omega =
LatexCmds.forall = (latex) => new VanillaSymbol('\\'+latex+' ','&'+latex+';')

// symbols that aren't a single MathCommand, but are instead a whole
// Fragment. Creates the Fragment from a LaTeX string
class LatexFragment extends MathCommand {
  constructor (latex) {
    this.latex = latex;
    // TODO - no super?
  }
  createLeftOf (cursor) {
    var block = latexMathParser.parse(this.latex);
    block.children().adopt(cursor.parent, cursor[L], cursor[R]);
    cursor[L] = block.ends[R];
    block.jQize().insertBefore(cursor.jQ);
    block.finalizeInsert(cursor.options, cursor);
    if (block.ends[R][R].siblingCreated) block.ends[R][R].siblingCreated(cursor.options, L);
    if (block.ends[L][L].siblingCreated) block.ends[L][L].siblingCreated(cursor.options, R);
    cursor.parent.bubble(function (node) { node.reflow(); });
  };
  mathspeak () { return latexMathParser.parse(this.latex).mathspeak(); };
  parser () {
    var frag = latexMathParser.parse(this.latex).children();
    return Parser.succeed(frag);
  };
};

// for what seems to me like [stupid reasons][1], Unicode provides
// subscripted and superscripted versions of all ten Arabic numerals,
// as well as [so-called "vulgar fractions"][2].
// Nobody really cares about most of them, but some of them actually
// predate Unicode, dating back to [ISO-8859-1][3], apparently also
// known as "Latin-1", which among other things [Windows-1252][4]
// largely coincides with, so Microsoft Word sometimes inserts them
// and they get copy-pasted into MathQuill.
//
// (Irrelevant but funny story: though not a superset of Latin-1 aka
// ISO-8859-1, Windows-1252 **is** a strict superset of the "closely
// related but distinct"[3] "ISO 8859-1" -- see the lack of a dash
// after "ISO"? Completely different character set, like elephants vs
// elephant seals, or "Zombies" vs "Zombie Redneck Torture Family".
// What kind of idiot would get them confused.
// People in fact got them confused so much, it was so common to
// mislabel Windows-1252 text as ISO-8859-1, that most modern web
// browsers and email clients treat the MIME charset of ISO-8859-1
// as actually Windows-1252, behavior now standard in the HTML5 spec.)
//
// [1]: http://en.wikipedia.org/wiki/Unicode_subscripts_andsuper_scripts
// [2]: http://en.wikipedia.org/wiki/Number_Forms
// [3]: http://en.wikipedia.org/wiki/ISO/IEC_8859-1
// [4]: http://en.wikipedia.org/wiki/Windows-1252
LatexCmds['⁰'] = () => new LatexFragment('^0');
LatexCmds['¹'] = () => new LatexFragment('^1');
LatexCmds['²'] = () => new LatexFragment('^2');
LatexCmds['³'] = () => new LatexFragment('^3');
LatexCmds['⁴'] = () => new LatexFragment('^4');
LatexCmds['⁵'] = () => new LatexFragment('^5');
LatexCmds['⁶'] = () => new LatexFragment('^6');
LatexCmds['⁷'] = () => new LatexFragment('^7');
LatexCmds['⁸'] = () => new LatexFragment('^8');
LatexCmds['⁹'] = () => new LatexFragment('^9');

LatexCmds['¼'] = () => new LatexFragment('\\frac14');
LatexCmds['½'] = () => new LatexFragment('\\frac12');
LatexCmds['¾'] = () => new LatexFragment('\\frac34');

// this is a hack to make pasting the √ symbol
// actually insert a sqrt command. This isn't ideal,
// but it's way better than what we have now. I think
// before we invest any more time into this single character
// we should consider how to make the pipe (|) automatically
// insert absolute value. We also will want the percent (%)
// to expand to '% of'. I've always just thought mathquill's
// ability to handle pasted latex magical until I started actually
// testing it. It's a lot more buggy that I previously thought.
//
// KNOWN ISSUES:
// 1) pasting √ does not put focus in side the sqrt symbol
// 2) pasting √2 puts the 2 outside of the sqrt symbol.
//
// The first issue seems like we could invest more time into this to
// fix it, but doesn't feel worth special casing. I think we'd want
// to address it by addressing ALL pasting issues.
//
// The second issue seems like it might go away too if you fix paste to
// act more like simply typing the characters out. I'd be scared to try
// to make that change because I'm fairly confident I'd break something
// around handling valid latex as latex rather than treating it as keystrokes.
LatexCmds['√'] = () => new LatexFragment('\\sqrt{}');

// Binary operator determination is used in several contexts for PlusMinus nodes and their descendants.
// For instance, we set the item's class name based on this factor, and also assign different mathspeak values (plus vs positive, negative vs minus).
function isBinaryOperator(node) {
  if (node[L]) {
    // If the left sibling is a binary operator or a separator (comma, semicolon, colon, space)
    // or an open bracket (open parenthesis, open square bracket)
    // consider the operator to be unary
    if (node[L] instanceof BinaryOperator || /^(\\ )|[,;:\(\[]$/.test(node[L].ctrlSeq)) {
      return false;
    }
  } else if (node.parent && node.parent.parent && node.parent.parent.isStyleBlock()) {
    //if we are in a style block at the leftmost edge, determine unary/binary based on
    //the style block
    //this allows style blocks to be transparent for unary/binary purposes
    return isBinaryOperator(node.parent.parent);
  } else {
    return false;
  }

  return true;
}

var PlusMinus = class extends BinaryOperator {
  constructor (ch, html, mathspeak) {
    super(ch, html, undefined, mathspeak, true);
  };
  
  contactWeld (opts, dir) { this.sharedSiblingMethod(opts, dir)}
  siblingCreated (opts, dir) { this.sharedSiblingMethod(opts, dir)}
  siblingDeleted (opts, dir) { this.sharedSiblingMethod(opts, dir)}
  
  sharedSiblingMethod (opts, dir) {
    if (dir === R) return; // ignore if sibling only changed on the right
    this.jQ[0].className = isBinaryOperator(this)
      ? 'mq-binary-operator'
      : '';

    return this;
  };
};

LatexCmds['+'] = class extends PlusMinus {
  constructor () {
    super('+', '+');
  };
  mathspeak () {
    return isBinaryOperator(this) ? 'plus' : 'positive';
  };
};

//yes, these are different dashes, en-dash, em-dash, unicode minus, actual dash
LatexCmds['−'] = LatexCmds['—'] = LatexCmds['–'] = LatexCmds['-'] = class extends PlusMinus {
  constructor () {
    super('-', '&minus;');
  };
  mathspeak () {
    return isBinaryOperator(this) ? 'minus' : 'negative';
  };
};

LatexCmds['±'] = LatexCmds.pm = LatexCmds.plusmn = LatexCmds.plusminus =
  () => new PlusMinus('\\pm ','&plusmn;', 'plus-or-minus');
LatexCmds.mp = LatexCmds.mnplus = LatexCmds.minusplus =
  () => new PlusMinus('\\mp ','&#8723;', 'minus-or-plus');

CharCmds['*'] = LatexCmds.sdot = LatexCmds.cdot =
  bindBinaryOperator('\\cdot ', '&middot;', '*', 'times'); //semantically should be &sdot;, but &middot; looks better

class To extends BinaryOperator {
  constructor () {
    super('\\to ','&rarr;', 'to');
  }
  deleteTowards (dir, cursor) {
    if (dir === L) {
      var l = cursor[L];
      new Fragment(l, this).remove();
      cursor[L] = l[L];
      new LatexCmds['−']().createLeftOf(cursor);
      cursor[L].bubble(function (node) { node.reflow(); });
      return;
    }
    super.deleteTowards.apply(this, arguments);
  };
}

LatexCmds['→'] = LatexCmds.to = To;

class Inequality extends BinaryOperator {
  constructor (data, strict) {
    this.data = data;
    this.strict = strict;
    var strictness = (strict ? 'Strict' : '');
    super(data['ctrlSeq'+strictness], data['html'+strictness],
                     data['text'+strictness], data['mathspeak'+strictness]);
  }

  swap (strict) {
    this.strict = strict;
    var strictness = (strict ? 'Strict' : '');
    this.ctrlSeq = this.data['ctrlSeq'+strictness];
    this.jQ.html(this.data['html'+strictness]);
    this.textTemplate = [ this.data['text'+strictness] ];
    this.mathspeakName = this.data['mathspeak'+strictness];
  };
  deleteTowards (dir, cursor) {
    if (dir === L && !this.strict) {
      this.swap(true);
      this.bubble(function (node) { node.reflow(); });
      return;
    }
    super.deleteTowards.apply(this, arguments);
  };
};

var less = { ctrlSeq: '\\le ', html: '&le;', text: '≤', mathspeak: 'less than or equal to',
             ctrlSeqStrict: '<', htmlStrict: '&lt;', textStrict: '<', mathspeakStrict: 'less than'};
var greater = { ctrlSeq: '\\ge ', html: '&ge;', text: '≥', mathspeak: 'greater than or equal to',
                ctrlSeqStrict: '>', htmlStrict: '&gt;', textStrict: '>', mathspeakStrict: 'greater than'};

class Greater extends Inequality {
  constructor () {
    super(greater, true);
  };
  createLeftOf (cursor) {
    if (cursor[L] instanceof BinaryOperator && cursor[L].ctrlSeq === '-') {
      var l = cursor[L];
      cursor[L] = l[L];
      l.remove();
      new To().createLeftOf(cursor);
      cursor[L].bubble(function (node) { node.reflow(); });
      return;
    }
    super.createLeftOf.apply(this, arguments);
  };
}

LatexCmds['<'] = LatexCmds.lt = () => new Inequality(less, true);
LatexCmds['>'] = LatexCmds.gt = Greater;
LatexCmds['≤'] = LatexCmds.le = LatexCmds.leq = () => new Inequality(less, false);
LatexCmds['≥'] = LatexCmds.ge = LatexCmds.geq = () => new Inequality(greater, false);
LatexCmds.infty = LatexCmds.infin = LatexCmds.infinity =
  bindVanillaSymbol('\\infty ','&infin;', 'infinity');
LatexCmds['≠'] = LatexCmds.ne = LatexCmds.neq = bindBinaryOperator('\\ne ','&ne;', 'not equal');

class Equality extends BinaryOperator {
  constructor () {
    super('=', '=', '=', 'equals');
  };
  createLeftOf (cursor) {
    if (cursor[L] instanceof Inequality && cursor[L].strict) {
      cursor[L].swap(false);
      cursor[L].bubble(function (node) { node.reflow(); });
      return;
    }
    super.createLeftOf.apply(this, arguments);
  };
};
LatexCmds['='] = Equality;

LatexCmds['×'] = LatexCmds.times = bindBinaryOperator('\\times ', '&times;', '[x]', 'times');

LatexCmds['÷'] = LatexCmds.div = LatexCmds.divide = LatexCmds.divides =
  bindBinaryOperator('\\div ','&divide;', '[/]', 'over');


class Sim extends BinaryOperator {
  constructor () {
    super('\\sim ', '~', '~', 'tilde');
  };
  createLeftOf (cursor) {
    if (cursor[L] instanceof Sim) {
      var l = cursor[L];
      cursor[L] = l[L];
      l.remove();
      new Approx().createLeftOf(cursor);
      cursor[L].bubble(function (node) { node.reflow(); });
      return;
    }
    super.createLeftOf.apply(this, arguments);
  };
};

class Approx extends BinaryOperator {
  constructor () {
    super('\\approx ', '&approx;', '≈', 'approximately equal');
  };
  deleteTowards (dir, cursor) {
    if (dir === L) {
      var l = cursor[L];
      new Fragment(l, this).remove();
      cursor[L] = l[L];
      new Sim().createLeftOf(cursor);
      cursor[L].bubble(function (node) { node.reflow(); });
      return;
    }
    super.deleteTowards.apply(this, arguments);
  };
};

CharCmds['~'] = LatexCmds.sim = Sim;
LatexCmds['≈'] = LatexCmds.approx = Approx;
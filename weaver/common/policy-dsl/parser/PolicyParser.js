/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// Generated from parser/Policy.g4 by ANTLR 4.9
// jshint ignore: start
import antlr4 from 'antlr4';
import PolicyListener from './PolicyListener.js';

const serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786",
    "\u5964\u0003\r$\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004\u0004",
    "\t\u0004\u0003\u0002\u0003\u0002\u0003\u0002\u0003\u0003\u0003\u0003",
    "\u0003\u0003\u0005\u0003\u000f\n\u0003\u0003\u0003\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0007\u0003\u0017\n\u0003",
    "\f\u0003\u000e\u0003\u001a\u000b\u0003\u0003\u0004\u0003\u0004\u0003",
    "\u0004\u0003\u0004\u0003\u0004\u0003\u0004\u0005\u0004\"\n\u0004\u0003",
    "\u0004\u0002\u0003\u0004\u0005\u0002\u0004\u0006\u0002\u0003\u0004\u0002",
    "\b\t\u000b\f\u0002$\u0002\b\u0003\u0002\u0002\u0002\u0004\u000e\u0003",
    "\u0002\u0002\u0002\u0006!\u0003\u0002\u0002\u0002\b\t\u0005\u0004\u0003",
    "\u0002\t\n\u0007\u0002\u0002\u0003\n\u0003\u0003\u0002\u0002\u0002\u000b",
    "\f\b\u0003\u0001\u0002\f\u000f\u0007\r\u0002\u0002\r\u000f\u0005\u0006",
    "\u0004\u0002\u000e\u000b\u0003\u0002\u0002\u0002\u000e\r\u0003\u0002",
    "\u0002\u0002\u000f\u0018\u0003\u0002\u0002\u0002\u0010\u0011\f\u0006",
    "\u0002\u0002\u0011\u0012\u0007\u0006\u0002\u0002\u0012\u0017\u0005\u0004",
    "\u0003\u0007\u0013\u0014\f\u0005\u0002\u0002\u0014\u0015\u0007\u0007",
    "\u0002\u0002\u0015\u0017\u0005\u0004\u0003\u0006\u0016\u0010\u0003\u0002",
    "\u0002\u0002\u0016\u0013\u0003\u0002\u0002\u0002\u0017\u001a\u0003\u0002",
    "\u0002\u0002\u0018\u0016\u0003\u0002\u0002\u0002\u0018\u0019\u0003\u0002",
    "\u0002\u0002\u0019\u0005\u0003\u0002\u0002\u0002\u001a\u0018\u0003\u0002",
    "\u0002\u0002\u001b\u001c\u0007\u0004\u0002\u0002\u001c\u001d\t\u0002",
    "\u0002\u0002\u001d\"\u0007\u0005\u0002\u0002\u001e\u001f\u0007\u0005",
    "\u0002\u0002\u001f \t\u0002\u0002\u0002 \"\u0007\u0004\u0002\u0002!",
    "\u001b\u0003\u0002\u0002\u0002!\u001e\u0003\u0002\u0002\u0002\"\u0007",
    "\u0003\u0002\u0002\u0002\u0006\u000e\u0016\u0018!"].join("");


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

const sharedContextCache = new antlr4.PredictionContextCache();

export default class PolicyParser extends antlr4.Parser {

    static grammarFileName = "Policy.g4";
    static literalNames = [ null, null, "'count'", null, "'&&'", "'||'", 
                            "'>'", "'<'", "'=='", "'>='", "'<='" ];
    static symbolicNames = [ null, "WS", "COUNT", "INTLIT", "AND", "OR", 
                             "GREATER_THAN", "LESS_THAN", "EQUAL", "GREATER_THAN_EQUAL", 
                             "LESS_THAN_EQUAL", "ID" ];
    static ruleNames = [ "root", "expression", "count_expression" ];

    constructor(input) {
        super(input);
        this._interp = new antlr4.atn.ParserATNSimulator(this, atn, decisionsToDFA, sharedContextCache);
        this.ruleNames = PolicyParser.ruleNames;
        this.literalNames = PolicyParser.literalNames;
        this.symbolicNames = PolicyParser.symbolicNames;
    }

    get atn() {
        return atn;
    }

    sempred(localctx, ruleIndex, predIndex) {
    	switch(ruleIndex) {
    	case 1:
    	    		return this.expression_sempred(localctx, predIndex);
        default:
            throw "No predicate with index:" + ruleIndex;
       }
    }

    expression_sempred(localctx, predIndex) {
    	switch(predIndex) {
    		case 0:
    			return this.precpred(this._ctx, 4);
    		case 1:
    			return this.precpred(this._ctx, 3);
    		default:
    			throw "No predicate with index:" + predIndex;
    	}
    };




	root() {
	    let localctx = new RootContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 0, PolicyParser.RULE_root);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 6;
	        this.expression(0);
	        this.state = 7;
	        this.match(PolicyParser.EOF);
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


	expression(_p) {
		if(_p===undefined) {
		    _p = 0;
		}
	    const _parentctx = this._ctx;
	    const _parentState = this.state;
	    let localctx = new ExpressionContext(this, this._ctx, _parentState);
	    let _prevctx = localctx;
	    const _startState = 2;
	    this.enterRecursionRule(localctx, 2, PolicyParser.RULE_expression, _p);
	    try {
	        this.enterOuterAlt(localctx, 1);
	        this.state = 12;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case PolicyParser.ID:
	            localctx = new IdExpressionContext(this, localctx);
	            this._ctx = localctx;
	            _prevctx = localctx;

	            this.state = 10;
	            this.match(PolicyParser.ID);
	            break;
	        case PolicyParser.COUNT:
	        case PolicyParser.INTLIT:
	            localctx = new CountExpressionContext(this, localctx);
	            this._ctx = localctx;
	            _prevctx = localctx;
	            this.state = 11;
	            this.count_expression();
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	        this._ctx.stop = this._input.LT(-1);
	        this.state = 22;
	        this._errHandler.sync(this);
	        let _alt = this._interp.adaptivePredict(this._input,2,this._ctx)
	        while(_alt!=2 && _alt!=antlr4.atn.ATN.INVALID_ALT_NUMBER) {
	            if(_alt===1) {
	                if(this._parseListeners!==null) {
	                    this.triggerExitRuleEvent();
	                }
	                _prevctx = localctx;
	                this.state = 20;
	                this._errHandler.sync(this);
	                var la_ = this._interp.adaptivePredict(this._input,1,this._ctx);
	                switch(la_) {
	                case 1:
	                    localctx = new BooleanAndExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
	                    this.pushNewRecursionContext(localctx, _startState, PolicyParser.RULE_expression);
	                    this.state = 14;
	                    if (!( this.precpred(this._ctx, 4))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 4)");
	                    }
	                    this.state = 15;
	                    this.match(PolicyParser.AND);
	                    this.state = 16;
	                    this.expression(5);
	                    break;

	                case 2:
	                    localctx = new BooleanOrExpressionContext(this, new ExpressionContext(this, _parentctx, _parentState));
	                    this.pushNewRecursionContext(localctx, _startState, PolicyParser.RULE_expression);
	                    this.state = 17;
	                    if (!( this.precpred(this._ctx, 3))) {
	                        throw new antlr4.error.FailedPredicateException(this, "this.precpred(this._ctx, 3)");
	                    }
	                    this.state = 18;
	                    this.match(PolicyParser.OR);
	                    this.state = 19;
	                    this.expression(4);
	                    break;

	                } 
	            }
	            this.state = 24;
	            this._errHandler.sync(this);
	            _alt = this._interp.adaptivePredict(this._input,2,this._ctx);
	        }

	    } catch( error) {
	        if(error instanceof antlr4.error.RecognitionException) {
		        localctx.exception = error;
		        this._errHandler.reportError(this, error);
		        this._errHandler.recover(this, error);
		    } else {
		    	throw error;
		    }
	    } finally {
	        this.unrollRecursionContexts(_parentctx)
	    }
	    return localctx;
	}



	count_expression() {
	    let localctx = new Count_expressionContext(this, this._ctx, this.state);
	    this.enterRule(localctx, 4, PolicyParser.RULE_count_expression);
	    var _la = 0; // Token type
	    try {
	        this.state = 31;
	        this._errHandler.sync(this);
	        switch(this._input.LA(1)) {
	        case PolicyParser.COUNT:
	            this.enterOuterAlt(localctx, 1);
	            this.state = 25;
	            this.match(PolicyParser.COUNT);
	            this.state = 26;
	            _la = this._input.LA(1);
	            if(!((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << PolicyParser.GREATER_THAN) | (1 << PolicyParser.LESS_THAN) | (1 << PolicyParser.GREATER_THAN_EQUAL) | (1 << PolicyParser.LESS_THAN_EQUAL))) !== 0))) {
	            this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            this.state = 27;
	            this.match(PolicyParser.INTLIT);
	            break;
	        case PolicyParser.INTLIT:
	            this.enterOuterAlt(localctx, 2);
	            this.state = 28;
	            this.match(PolicyParser.INTLIT);
	            this.state = 29;
	            _la = this._input.LA(1);
	            if(!((((_la) & ~0x1f) == 0 && ((1 << _la) & ((1 << PolicyParser.GREATER_THAN) | (1 << PolicyParser.LESS_THAN) | (1 << PolicyParser.GREATER_THAN_EQUAL) | (1 << PolicyParser.LESS_THAN_EQUAL))) !== 0))) {
	            this._errHandler.recoverInline(this);
	            }
	            else {
	            	this._errHandler.reportMatch(this);
	                this.consume();
	            }
	            this.state = 30;
	            this.match(PolicyParser.COUNT);
	            break;
	        default:
	            throw new antlr4.error.NoViableAltException(this);
	        }
	    } catch (re) {
	    	if(re instanceof antlr4.error.RecognitionException) {
		        localctx.exception = re;
		        this._errHandler.reportError(this, re);
		        this._errHandler.recover(this, re);
		    } else {
		    	throw re;
		    }
	    } finally {
	        this.exitRule();
	    }
	    return localctx;
	}


}

PolicyParser.EOF = antlr4.Token.EOF;
PolicyParser.WS = 1;
PolicyParser.COUNT = 2;
PolicyParser.INTLIT = 3;
PolicyParser.AND = 4;
PolicyParser.OR = 5;
PolicyParser.GREATER_THAN = 6;
PolicyParser.LESS_THAN = 7;
PolicyParser.EQUAL = 8;
PolicyParser.GREATER_THAN_EQUAL = 9;
PolicyParser.LESS_THAN_EQUAL = 10;
PolicyParser.ID = 11;

PolicyParser.RULE_root = 0;
PolicyParser.RULE_expression = 1;
PolicyParser.RULE_count_expression = 2;

class RootContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = PolicyParser.RULE_root;
    }

	expression() {
	    return this.getTypedRuleContext(ExpressionContext,0);
	};

	EOF() {
	    return this.getToken(PolicyParser.EOF, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.enterRoot(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.exitRoot(this);
		}
	}


}



class ExpressionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = PolicyParser.RULE_expression;
    }


	 
		copyFrom(ctx) {
			super.copyFrom(ctx);
		}

}


class IdExpressionContext extends ExpressionContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	ID() {
	    return this.getToken(PolicyParser.ID, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.enterIdExpression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.exitIdExpression(this);
		}
	}


}

PolicyParser.IdExpressionContext = IdExpressionContext;

class BooleanOrExpressionContext extends ExpressionContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	expression = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExpressionContext);
	    } else {
	        return this.getTypedRuleContext(ExpressionContext,i);
	    }
	};

	OR() {
	    return this.getToken(PolicyParser.OR, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.enterBooleanOrExpression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.exitBooleanOrExpression(this);
		}
	}


}

PolicyParser.BooleanOrExpressionContext = BooleanOrExpressionContext;

class CountExpressionContext extends ExpressionContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	count_expression() {
	    return this.getTypedRuleContext(Count_expressionContext,0);
	};

	enterRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.enterCountExpression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.exitCountExpression(this);
		}
	}


}

PolicyParser.CountExpressionContext = CountExpressionContext;

class BooleanAndExpressionContext extends ExpressionContext {

    constructor(parser, ctx) {
        super(parser);
        super.copyFrom(ctx);
    }

	expression = function(i) {
	    if(i===undefined) {
	        i = null;
	    }
	    if(i===null) {
	        return this.getTypedRuleContexts(ExpressionContext);
	    } else {
	        return this.getTypedRuleContext(ExpressionContext,i);
	    }
	};

	AND() {
	    return this.getToken(PolicyParser.AND, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.enterBooleanAndExpression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.exitBooleanAndExpression(this);
		}
	}


}

PolicyParser.BooleanAndExpressionContext = BooleanAndExpressionContext;

class Count_expressionContext extends antlr4.ParserRuleContext {

    constructor(parser, parent, invokingState) {
        if(parent===undefined) {
            parent = null;
        }
        if(invokingState===undefined || invokingState===null) {
            invokingState = -1;
        }
        super(parent, invokingState);
        this.parser = parser;
        this.ruleIndex = PolicyParser.RULE_count_expression;
    }

	COUNT() {
	    return this.getToken(PolicyParser.COUNT, 0);
	};

	INTLIT() {
	    return this.getToken(PolicyParser.INTLIT, 0);
	};

	GREATER_THAN() {
	    return this.getToken(PolicyParser.GREATER_THAN, 0);
	};

	GREATER_THAN_EQUAL() {
	    return this.getToken(PolicyParser.GREATER_THAN_EQUAL, 0);
	};

	LESS_THAN() {
	    return this.getToken(PolicyParser.LESS_THAN, 0);
	};

	LESS_THAN_EQUAL() {
	    return this.getToken(PolicyParser.LESS_THAN_EQUAL, 0);
	};

	enterRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.enterCount_expression(this);
		}
	}

	exitRule(listener) {
	    if(listener instanceof PolicyListener ) {
	        listener.exitCount_expression(this);
		}
	}


}




PolicyParser.RootContext = RootContext; 
PolicyParser.ExpressionContext = ExpressionContext; 
PolicyParser.Count_expressionContext = Count_expressionContext; 

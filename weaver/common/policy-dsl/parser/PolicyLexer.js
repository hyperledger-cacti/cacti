/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// Generated from parser/Policy.g4 by ANTLR 4.9
// jshint ignore: start
import antlr4 from 'antlr4';



const serializedATN = ["\u0003\u608b\ua72a\u8133\ub9ed\u417c\u3be7\u7786",
    "\u5964\u0002\rP\b\u0001\u0004\u0002\t\u0002\u0004\u0003\t\u0003\u0004",
    "\u0004\t\u0004\u0004\u0005\t\u0005\u0004\u0006\t\u0006\u0004\u0007\t",
    "\u0007\u0004\b\t\b\u0004\t\t\t\u0004\n\t\n\u0004\u000b\t\u000b\u0004",
    "\f\t\f\u0003\u0002\u0006\u0002\u001b\n\u0002\r\u0002\u000e\u0002\u001c",
    "\u0003\u0002\u0003\u0002\u0003\u0003\u0003\u0003\u0003\u0003\u0003\u0003",
    "\u0003\u0003\u0003\u0003\u0003\u0004\u0003\u0004\u0003\u0004\u0007\u0004",
    "*\n\u0004\f\u0004\u000e\u0004-\u000b\u0004\u0005\u0004/\n\u0004\u0003",
    "\u0005\u0003\u0005\u0003\u0005\u0003\u0006\u0003\u0006\u0003\u0006\u0003",
    "\u0007\u0003\u0007\u0003\b\u0003\b\u0003\t\u0003\t\u0003\t\u0003\n\u0003",
    "\n\u0003\n\u0003\u000b\u0003\u000b\u0003\u000b\u0003\f\u0007\fE\n\f",
    "\f\f\u000e\fH\u000b\f\u0003\f\u0003\f\u0007\fL\n\f\f\f\u000e\fO\u000b",
    "\f\u0002\u0002\r\u0003\u0003\u0005\u0004\u0007\u0005\t\u0006\u000b\u0007",
    "\r\b\u000f\t\u0011\n\u0013\u000b\u0015\f\u0017\r\u0003\u0002\b\u0004",
    "\u0002\"\"vv\u0003\u00023;\u0003\u00022;\u0003\u0002aa\u0003\u0002c",
    "|\u0006\u00022;C\\aac|\u0002T\u0002\u0003\u0003\u0002\u0002\u0002\u0002",
    "\u0005\u0003\u0002\u0002\u0002\u0002\u0007\u0003\u0002\u0002\u0002\u0002",
    "\t\u0003\u0002\u0002\u0002\u0002\u000b\u0003\u0002\u0002\u0002\u0002",
    "\r\u0003\u0002\u0002\u0002\u0002\u000f\u0003\u0002\u0002\u0002\u0002",
    "\u0011\u0003\u0002\u0002\u0002\u0002\u0013\u0003\u0002\u0002\u0002\u0002",
    "\u0015\u0003\u0002\u0002\u0002\u0002\u0017\u0003\u0002\u0002\u0002\u0003",
    "\u001a\u0003\u0002\u0002\u0002\u0005 \u0003\u0002\u0002\u0002\u0007",
    ".\u0003\u0002\u0002\u0002\t0\u0003\u0002\u0002\u0002\u000b3\u0003\u0002",
    "\u0002\u0002\r6\u0003\u0002\u0002\u0002\u000f8\u0003\u0002\u0002\u0002",
    "\u0011:\u0003\u0002\u0002\u0002\u0013=\u0003\u0002\u0002\u0002\u0015",
    "@\u0003\u0002\u0002\u0002\u0017F\u0003\u0002\u0002\u0002\u0019\u001b",
    "\t\u0002\u0002\u0002\u001a\u0019\u0003\u0002\u0002\u0002\u001b\u001c",
    "\u0003\u0002\u0002\u0002\u001c\u001a\u0003\u0002\u0002\u0002\u001c\u001d",
    "\u0003\u0002\u0002\u0002\u001d\u001e\u0003\u0002\u0002\u0002\u001e\u001f",
    "\b\u0002\u0002\u0002\u001f\u0004\u0003\u0002\u0002\u0002 !\u0007e\u0002",
    "\u0002!\"\u0007q\u0002\u0002\"#\u0007w\u0002\u0002#$\u0007p\u0002\u0002",
    "$%\u0007v\u0002\u0002%\u0006\u0003\u0002\u0002\u0002&/\u00072\u0002",
    "\u0002\'+\t\u0003\u0002\u0002(*\t\u0004\u0002\u0002)(\u0003\u0002\u0002",
    "\u0002*-\u0003\u0002\u0002\u0002+)\u0003\u0002\u0002\u0002+,\u0003\u0002",
    "\u0002\u0002,/\u0003\u0002\u0002\u0002-+\u0003\u0002\u0002\u0002.&\u0003",
    "\u0002\u0002\u0002.\'\u0003\u0002\u0002\u0002/\b\u0003\u0002\u0002\u0002",
    "01\u0007(\u0002\u000212\u0007(\u0002\u00022\n\u0003\u0002\u0002\u0002",
    "34\u0007~\u0002\u000245\u0007~\u0002\u00025\f\u0003\u0002\u0002\u0002",
    "67\u0007@\u0002\u00027\u000e\u0003\u0002\u0002\u000289\u0007>\u0002",
    "\u00029\u0010\u0003\u0002\u0002\u0002:;\u0007?\u0002\u0002;<\u0007?",
    "\u0002\u0002<\u0012\u0003\u0002\u0002\u0002=>\u0007@\u0002\u0002>?\u0007",
    "?\u0002\u0002?\u0014\u0003\u0002\u0002\u0002@A\u0007>\u0002\u0002AB",
    "\u0007?\u0002\u0002B\u0016\u0003\u0002\u0002\u0002CE\t\u0005\u0002\u0002",
    "DC\u0003\u0002\u0002\u0002EH\u0003\u0002\u0002\u0002FD\u0003\u0002\u0002",
    "\u0002FG\u0003\u0002\u0002\u0002GI\u0003\u0002\u0002\u0002HF\u0003\u0002",
    "\u0002\u0002IM\t\u0006\u0002\u0002JL\t\u0007\u0002\u0002KJ\u0003\u0002",
    "\u0002\u0002LO\u0003\u0002\u0002\u0002MK\u0003\u0002\u0002\u0002MN\u0003",
    "\u0002\u0002\u0002N\u0018\u0003\u0002\u0002\u0002OM\u0003\u0002\u0002",
    "\u0002\b\u0002\u001c+.FM\u0003\b\u0002\u0002"].join("");


const atn = new antlr4.atn.ATNDeserializer().deserialize(serializedATN);

const decisionsToDFA = atn.decisionToState.map( (ds, index) => new antlr4.dfa.DFA(ds, index) );

export default class PolicyLexer extends antlr4.Lexer {

    static grammarFileName = "Policy.g4";
    static channelNames = [ "DEFAULT_TOKEN_CHANNEL", "HIDDEN" ];
	static modeNames = [ "DEFAULT_MODE" ];
	static literalNames = [ null, null, "'count'", null, "'&&'", "'||'", "'>'", 
                         "'<'", "'=='", "'>='", "'<='" ];
	static symbolicNames = [ null, "WS", "COUNT", "INTLIT", "AND", "OR", "GREATER_THAN", 
                          "LESS_THAN", "EQUAL", "GREATER_THAN_EQUAL", "LESS_THAN_EQUAL", 
                          "ID" ];
	static ruleNames = [ "WS", "COUNT", "INTLIT", "AND", "OR", "GREATER_THAN", 
                      "LESS_THAN", "EQUAL", "GREATER_THAN_EQUAL", "LESS_THAN_EQUAL", 
                      "ID" ];

    constructor(input) {
        super(input)
        this._interp = new antlr4.atn.LexerATNSimulator(this, atn, decisionsToDFA, new antlr4.PredictionContextCache());
    }

    get atn() {
        return atn;
    }
}

PolicyLexer.EOF = antlr4.Token.EOF;
PolicyLexer.WS = 1;
PolicyLexer.COUNT = 2;
PolicyLexer.INTLIT = 3;
PolicyLexer.AND = 4;
PolicyLexer.OR = 5;
PolicyLexer.GREATER_THAN = 6;
PolicyLexer.LESS_THAN = 7;
PolicyLexer.EQUAL = 8;
PolicyLexer.GREATER_THAN_EQUAL = 9;
PolicyLexer.LESS_THAN_EQUAL = 10;
PolicyLexer.ID = 11;




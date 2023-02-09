grammar Policy;


// ============
// PARSER RULES
// ============
root
    : expression EOF
    ;

// TODO: Add paren support
// | LPAREN expression RPAREN                        # parenExpression
expression 
           : expression AND expression  #booleanAndExpression
           | expression OR expression   #booleanOrExpression
           | ID                         #idExpression
           | count_expression           #countExpression
           ;

count_expression
    : COUNT (GREATER_THAN | GREATER_THAN_EQUAL | LESS_THAN | LESS_THAN_EQUAL) INTLIT
    | INTLIT (GREATER_THAN | GREATER_THAN_EQUAL | LESS_THAN | LESS_THAN_EQUAL) COUNT
    ;

// ======
// TOKENS
// ======

// Whitespace
WS                 : [t ]+ -> skip ;

// Keywords
COUNT                : 'count' ;

// Literals
INTLIT             : '0'|[1-9][0-9]* ;

// Operators
AND                 : '&&' ;
OR                  : '||' ;
GREATER_THAN        : '>' ;
LESS_THAN           : '<' ;
EQUAL               : '==' ;
GREATER_THAN_EQUAL  : '>=' ;
LESS_THAN_EQUAL     : '<=' ;

// Identifiers
ID                 : [_]*[a-z][A-Za-z0-9_]* ;

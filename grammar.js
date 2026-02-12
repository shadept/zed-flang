/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: 'flang',

  extras: ($) => [/\s/, $.line_comment],

  word: ($) => $.identifier,

  conflicts: ($) => [
    [$.assignment_expression, $.unary_expression],
    [$.cast_expression, $.unary_expression],
    [$.const_statement, $.binary_expression],
    [$.const_statement, $.index_expression],
    [$.const_statement, $.member_expression, $.dereference_expression],
    [$.defer_statement, $.binary_expression],
    [$.defer_statement, $.index_expression],
    [$.defer_statement, $.member_expression, $.dereference_expression],
    [$.expression_statement, $.binary_expression],
    [$.expression_statement, $.index_expression],
    [$.expression_statement, $.member_expression, $.dereference_expression],
    [$.function_definition],
    [$.named_type],
    [$.named_type, $.primary_expression],
    [$.let_statement, $.binary_expression],
    [$.let_statement, $.index_expression],
    [$.let_statement, $.member_expression, $.dereference_expression],
    [$.match_expression, $.unary_expression],
    [$.primary_expression, $.struct_literal],
    [$.lambda_param, $.named_type],
    [$.lambda_param, $._function_type_param],
  ],

  precedences: ($) => [
    [
      'member',
      'unary',
      'multiplicative',
      'additive',
      'bitwise_and',
      'bitwise_xor',
      'bitwise_or',
      'range',
      'comparison',
      'equality',
      'logical_and',
      'logical_or',
      'coalesce',
    ],
  ],

  rules: {
    source_file: ($) => repeat($._definition),

    _definition: ($) =>
      choice(
        $.function_definition,
        $.struct_definition,
        $.enum_definition,
        $.const_declaration,
        $.import_declaration,
        $.test_block,
      ),

    // ===== IMPORTS =====
    import_declaration: ($) => seq(optional($.visibility_modifier), 'import', $.module_path),

    module_path: ($) => seq($.identifier, repeat(seq('.', $.identifier))),

    // ===== VISIBILITY =====
    visibility_modifier: ($) => 'pub',

    // ===== DIRECTIVES =====
    directive: ($) => /#[a-z][a-zA-Z0-9_]*/,

    // ===== FUNCTIONS =====
    function_definition: ($) =>
      seq(
        optional($.visibility_modifier),
        optional($.directive),
        'fn',
        field('name', $.identifier),
        field('parameters', $.parameter_list),
        optional(field('return_type', $.type)),
        optional(field('body', $.block)),
      ),

    parameter_list: ($) =>
      seq('(', optional(seq($.parameter, repeat(seq(',', $.parameter)), optional(','))), ')'),

    parameter: ($) => seq(field('name', $.identifier), ':', field('type', $.type)),

    // ===== STRUCTS =====
    struct_definition: ($) =>
      seq(
        optional($.visibility_modifier),
        'struct',
        field('name', $.identifier),
        optional($.generic_parameters),
        $.struct_body,
      ),

    struct_body: ($) => seq('{', repeat($.struct_field), '}'),

    struct_field: ($) =>
      seq(field('name', $.identifier), ':', field('type', $.type), optional(',')),

    // ===== ENUMS =====
    enum_definition: ($) =>
      seq(
        optional($.visibility_modifier),
        'enum',
        field('name', $.identifier),
        optional($.generic_parameters),
        $.enum_body,
      ),

    enum_body: ($) => seq('{', repeat($.enum_variant), '}'),

    enum_variant: ($) =>
      seq(
        field('name', $.identifier),
        optional(choice($.variant_parameters, seq('=', field('value', $.expression)))),
        optional(','),
      ),

    variant_parameters: ($) =>
      seq('(', optional(seq($.type, repeat(seq(',', $.type)), optional(','))), ')'),

    // ===== GENERICS =====
    generic_parameters: ($) =>
      seq('(', $.generic_parameter, repeat(seq(',', $.generic_parameter)), optional(','), ')'),

    generic_parameter: ($) => $.identifier,

    generic_arguments: ($) => seq('(', $.type, repeat(seq(',', $.type)), optional(','), ')'),

    // ===== CONSTANTS =====
    const_declaration: ($) =>
      seq(
        optional($.visibility_modifier),
        'const',
        field('name', $.identifier),
        optional(seq(':', field('type', $.type))),
        '=',
        field('value', $.expression),
      ),

    // ===== TYPES =====
    type: ($) =>
      choice(
        $.primitive_type,
        $.named_type,
        $.generic_type_parameter,
        $.reference_type,
        $.optional_type,
        $.slice_type,
        $.array_type,
        $.function_type,
        $.tuple_type,
      ),

    primitive_type: ($) =>
      choice(
        'void',
        'bool',
        'char',
        'i8',
        'i16',
        'i32',
        'i64',
        'isize',
        'u8',
        'u16',
        'u32',
        'u64',
        'usize',
      ),

    named_type: ($) => seq($.identifier, optional($.generic_arguments)),

    generic_type_parameter: ($) => seq('$', $.identifier),

    reference_type: ($) => prec(2, seq('&', $.type)),

    array_type: ($) => seq('[', $.type, ';', $.expression, ']'),

    optional_type: ($) => prec.left(1, seq($.type, '?')),

    slice_type: ($) => prec.left(1, seq($.type, '[', ']')),

    tuple_type: ($) =>
      seq('(', optional(seq($.type, repeat(seq(',', $.type)), optional(','))), ')'),

    function_type: ($) =>
      seq(
        'fn',
        '(',
        optional(
          seq($._function_type_param, repeat(seq(',', $._function_type_param)), optional(',')),
        ),
        ')',
        $.type,
      ),

    _function_type_param: ($) => choice($.type, seq($.identifier, ':', $.type)),

    // ===== STATEMENTS =====
    block: ($) => seq('{', repeat($._statement), '}'),

    _statement: ($) =>
      choice(
        $.let_statement,
        $.const_statement,
        $.return_statement,
        $.defer_statement,
        $.for_statement,
        $.loop_statement,
        $.break_statement,
        $.continue_statement,
        $.expression_statement,
      ),

    let_statement: ($) =>
      seq(
        'let',
        field('name', $.identifier),
        optional(seq(':', field('type', $.type))),
        optional(seq('=', field('value', $.expression))),
      ),

    const_statement: ($) =>
      seq(
        'const',
        field('name', $.identifier),
        optional(seq(':', field('type', $.type))),
        '=',
        field('value', $.expression),
      ),

    return_statement: ($) => prec.right(seq('return', optional($.expression))),

    defer_statement: ($) => seq('defer', $.expression),

    loop_statement: ($) => seq('loop', field('body', $.block)),

    break_statement: ($) => 'break',

    continue_statement: ($) => 'continue',

    for_statement: ($) =>
      seq(
        'for',
        choice(
          seq('(', field('pattern', $.identifier), 'in', field('iterable', $.expression), ')'),
          seq(field('pattern', $.identifier), 'in', field('iterable', $.expression)),
        ),
        field('body', $.block),
      ),

    expression_statement: ($) => $.expression,

    // ===== EXPRESSIONS =====
    expression: ($) =>
      choice(
        $.assignment_expression,
        $.binary_expression,
        $.unary_expression,
        $.cast_expression,
        $.match_expression,
        $.if_expression,
        $.primary_expression,
      ),

    assignment_expression: ($) =>
      prec.right(
        1,
        seq(
          field('left', $.expression),
          field('operator', choice('=', '+=')),
          field('right', $.expression),
        ),
      ),

    binary_expression: ($) =>
      choice(
        prec.left('coalesce', seq($.expression, '??', $.expression)),
        prec.left('logical_or', seq($.expression, 'or', $.expression)),
        prec.left('logical_and', seq($.expression, 'and', $.expression)),
        prec.left('equality', seq($.expression, choice('==', '!='), $.expression)),
        prec.left('comparison', seq($.expression, choice('<', '>', '<=', '>='), $.expression)),
        prec.left('range', seq($.expression, '..', optional($.expression))),
        prec.left('bitwise_or', seq($.expression, '|', $.expression)),
        prec.left('bitwise_xor', seq($.expression, '^', $.expression)),
        prec.left('bitwise_and', seq($.expression, '&', $.expression)),
        prec.left('additive', seq($.expression, choice('+', '-'), $.expression)),
        prec.left('multiplicative', seq($.expression, choice('*', '/', '%'), $.expression)),
      ),

    unary_expression: ($) =>
      prec('unary', choice(seq('-', $.expression), seq('!', $.expression), seq('&', $.expression))),

    cast_expression: ($) => prec.left(seq($.expression, 'as', $.type)),

    match_expression: ($) =>
      seq(field('scrutinee', $.expression), 'match', '{', repeat($.match_arm), '}'),

    match_arm: ($) =>
      seq(
        field('pattern', $.pattern),
        '=>',
        field('body', choice($.block, $.expression)),
        optional(','),
      ),

    pattern: ($) => choice($.wildcard_pattern, $.variant_pattern, 'else'),

    wildcard_pattern: ($) => '_',

    variant_pattern: ($) =>
      seq(
        optional(seq($.identifier, '.')),
        $.identifier,
        optional(
          seq('(', optional(seq($.pattern, repeat(seq(',', $.pattern)), optional(','))), ')'),
        ),
      ),

    if_expression: ($) =>
      prec.right(
        seq(
          'if',
          field('condition', $.expression),
          field('consequence', $.block),
          optional(field('alternative', $.else_clause)),
        ),
      ),

    else_clause: ($) => seq('else', choice($.if_expression, $.block)),

    primary_expression: ($) =>
      choice(
        $.identifier,
        $.boolean_literal,
        $.number_literal,
        $.char_literal,
        $.null_literal,
        $.array_literal,
        $.struct_literal,
        $.string_literal,
        $.anonymous_struct_literal,
        $.dereference_expression,
        $.function_call,
        $.grouped_expression,
        $.index_expression,
        $.lambda_expression,
        $.member_expression,
        $.optional_chain_expression,
        $.tuple_expression,
      ),

    grouped_expression: ($) => seq('(', $.expression, ')'),

    tuple_expression: ($) =>
      seq(
        '(',
        $.expression,
        ',',
        optional(seq($.expression, repeat(seq(',', $.expression)))),
        optional(','),
        ')',
      ),

    array_literal: ($) =>
      seq(
        '[',
        choice(
          // Empty array
          seq(),
          // Repeat syntax: [value; count]
          seq($.expression, ';', $.expression),
          // List of elements
          seq($.expression, repeat(seq(',', $.expression)), optional(',')),
        ),
        ']',
      ),

    struct_literal: ($) =>
      seq(
        $.identifier,
        optional($.generic_arguments),
        '{',
        optional(seq($._field_entry, repeat(seq(',', $._field_entry)), optional(','))),
        '}',
      ),

    anonymous_struct_literal: ($) =>
      seq(
        '.',
        '{',
        optional(seq($._field_entry, repeat(seq(',', $._field_entry)), optional(','))),
        '}',
      ),

    _field_entry: ($) => choice($.field_initializer, $.field_shorthand),

    field_initializer: ($) => seq(field('name', $.identifier), '=', field('value', $.expression)),

    field_shorthand: ($) => $.identifier,

    function_call: ($) =>
      prec(
        2,
        seq(
          field('function', choice($.identifier, $.member_expression)),
          '(',
          optional(seq($.expression, repeat(seq(',', $.expression)), optional(','))),
          ')',
        ),
      ),

    // ===== LAMBDAS =====
    lambda_expression: ($) =>
      seq(
        'fn',
        '(',
        optional(seq($.lambda_param, repeat(seq(',', $.lambda_param)), optional(','))),
        ')',
        optional(field('return_type', $.type)),
        field('body', $.block),
      ),

    lambda_param: ($) =>
      seq(field('name', $.identifier), optional(seq(':', field('type', $.type)))),

    member_expression: ($) =>
      prec.left('member', seq($.expression, '.', choice($.identifier, $.number_literal))),

    index_expression: ($) => prec.left('member', seq($.expression, '[', $.expression, ']')),

    dereference_expression: ($) => prec.left('member', seq($.expression, '.', '*')),

    optional_chain_expression: ($) => prec.left('member', seq($.expression, '?.', $.identifier)),

    // ===== LITERALS =====
    number_literal: ($) =>
      choice(
        /0x[0-9a-fA-F_]+/,
        /0b[01_]+/,
        /0o[0-7_]+/,
        /[0-9][0-9_]*(i8|i16|i32|i64|isize|u8|u16|u32|u64|usize)?/,
      ),

    string_literal: ($) => seq('"', repeat(choice($.escape_sequence, /[^"\\]+/)), '"'),

    char_literal: ($) =>
      choice(
        // eslint-disable-next-line quotes
        seq("'", choice($.escape_sequence, /[^'\\]/), "'"),
        // Byte char literal (b'x') — wrapped in token() so 'b' isn't extracted as a keyword
        // eslint-disable-next-line quotes
        token(seq('b', "'", choice(/\\[nrt"'\\0]/, /[^'\\]/), "'")),
      ),

    escape_sequence: ($) => /\\[nrt"'\\0]/,

    boolean_literal: ($) => choice('true', 'false'),

    null_literal: ($) => 'null',

    // ===== IDENTIFIERS =====
    identifier: ($) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // ===== TESTS =====
    test_block: ($) => seq('test', field('name', $.string_literal), field('body', $.block)),

    // ===== COMMENTS =====
    line_comment: ($) => seq('//', /.*/),
  },
});

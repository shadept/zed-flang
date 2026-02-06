/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "flang",

  extras: ($) => [/\s/, $.line_comment],

  word: ($) => $.identifier,

  conflicts: ($) => [
    [$.generic_type, $.function_call],
    [$.function_definition],
    [$.primary_expression, $.struct_literal],
    [$.expression_statement, $.member_expression, $.dereference_expression],
    [$.expression_statement, $.index_expression],
    [$.expression_statement, $.binary_expression],
    [$.assignment_expression, $.unary_expression],
    [$.assignment_expression, $.binary_expression, $.unary_expression],
    [$.cast_expression, $.unary_expression],
    [$.cast_expression, $.binary_expression, $.unary_expression],
    [$.match_expression, $.unary_expression],
    [$.match_expression, $.binary_expression, $.unary_expression],
    [$.defer_statement, $.member_expression, $.dereference_expression],
    [$.defer_statement, $.index_expression],
    [$.defer_statement, $.binary_expression],
    [$.named_type],
    [$.slice_type, $.function_type],
    [$.const_statement, $.member_expression, $.dereference_expression],
    [$.const_statement, $.index_expression],
    [$.const_statement, $.binary_expression],
    [$.let_statement, $.member_expression, $.dereference_expression],
    [$.let_statement, $.index_expression],
    [$.let_statement, $.binary_expression],
    [
      $.if_statement,
      $.if_expression,
      $.member_expression,
      $.dereference_expression,
    ],
    [$.if_statement, $.if_expression, $.index_expression],
    [$.if_statement, $.if_expression, $.binary_expression],
    [$.if_statement, $.if_expression],
    [$.if_statement, $.member_expression, $.dereference_expression],
    [$.if_statement, $.index_expression],
    [$.if_statement, $.binary_expression],
    [$.if_statement, $.if_expression, $.grouped_expression],
    [$.if_expression, $.grouped_expression],
    [$.if_statement, $.grouped_expression],
    [$.array_literal, $.index_expression],
  ],

  precedences: ($) => [
    [
      "member",
      "unary",
      "multiplicative",
      "additive",
      "bitwise_and",
      "bitwise_xor",
      "bitwise_or",
      "range",
      "comparison",
      "equality",
      "logical_and",
      "logical_or",
      "coalesce",
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
    import_declaration: ($) =>
      seq(optional($.visibility_modifier), "import", $.module_path),

    module_path: ($) => seq($.identifier, repeat(seq(".", $.identifier))),

    // ===== VISIBILITY =====
    visibility_modifier: ($) => "pub",

    // ===== DIRECTIVES =====
    directive: ($) => /#[a-z][a-zA-Z0-9_]*/,

    // ===== FUNCTIONS =====
    function_definition: ($) =>
      seq(
        optional($.visibility_modifier),
        optional($.directive),
        "fn",
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        optional(field("return_type", $.type)),
        optional(field("body", $.block)),
      ),

    parameter_list: ($) =>
      seq(
        "(",
        optional(
          seq($.parameter, repeat(seq(",", $.parameter)), optional(",")),
        ),
        ")",
      ),

    parameter: ($) =>
      seq(field("name", $.identifier), ":", field("type", $.type)),

    // ===== STRUCTS =====
    struct_definition: ($) =>
      seq(
        optional($.visibility_modifier),
        "struct",
        field("name", $.type_identifier),
        optional($.generic_parameters),
        $.struct_body,
      ),

    struct_body: ($) => seq("{", repeat($.struct_field), "}"),

    struct_field: ($) =>
      seq(
        field("name", $.identifier),
        ":",
        field("type", $.type),
        optional(","),
      ),

    // ===== ENUMS =====
    enum_definition: ($) =>
      seq(
        optional($.visibility_modifier),
        "enum",
        field("name", $.type_identifier),
        optional($.generic_parameters),
        $.enum_body,
      ),

    enum_body: ($) => seq("{", repeat($.enum_variant), "}"),

    enum_variant: ($) =>
      seq(
        field("name", $.type_identifier),
        optional(
          choice(
            $.variant_parameters,
            seq("=", field("value", $.expression)),
          ),
        ),
        optional(","),
      ),

    variant_parameters: ($) =>
      seq(
        "(",
        optional(seq($.type, repeat(seq(",", $.type)), optional(","))),
        ")",
      ),

    // ===== GENERICS =====
    generic_parameters: ($) =>
      seq(
        "(",
        $.generic_parameter,
        repeat(seq(",", $.generic_parameter)),
        optional(","),
        ")",
      ),

    generic_parameter: ($) => $.type_identifier,

    generic_arguments: ($) =>
      seq("(", $.type, repeat(seq(",", $.type)), optional(","), ")"),

    // ===== CONSTANTS =====
    const_declaration: ($) =>
      seq(
        optional($.visibility_modifier),
        "const",
        field("name", $.identifier),
        optional(seq(":", field("type", $.type))),
        "=",
        field("value", $.expression),
      ),

    // ===== TESTS =====
    test_block: ($) =>
      seq("test", field("name", $.string_literal), field("body", $.block)),

    // ===== TYPES =====
    type: ($) =>
      choice(
        $.primitive_type,
        $.generic_type_parameter,
        $.reference_type,
        $.optional_type,
        $.slice_type,
        $.array_type,
        $.function_type,
        $.tuple_type,
        $.named_type,
      ),

    primitive_type: ($) =>
      choice(
        "i8",
        "i16",
        "i32",
        "i64",
        "isize",
        "u8",
        "u16",
        "u32",
        "u64",
        "usize",
        "bool",
      ),

    generic_type_parameter: ($) => seq("$", $.identifier),

    reference_type: ($) => prec(2, seq("&", $.type)),

    optional_type: ($) => prec.left(1, seq($.type, "?")),

    slice_type: ($) => seq($.type, "[", "]"),

    array_type: ($) => seq("[", $.type, ";", $.expression, "]"),

    function_type: ($) =>
      seq(
        "fn",
        "(",
        optional(
          seq(
            $._function_type_param,
            repeat(seq(",", $._function_type_param)),
            optional(","),
          ),
        ),
        ")",
        $.type,
      ),

    _function_type_param: ($) => choice($.type, seq($.identifier, ":", $.type)),

    tuple_type: ($) =>
      seq(
        "(",
        optional(seq($.type, repeat(seq(",", $.type)), optional(","))),
        ")",
      ),

    named_type: ($) => seq($.type_identifier, optional($.generic_arguments)),

    generic_type: ($) => seq($.type_identifier, $.generic_arguments),

    // ===== STATEMENTS =====
    block: ($) => seq("{", repeat($._statement), "}"),

    _statement: ($) =>
      choice(
        $.let_statement,
        $.const_statement,
        $.return_statement,
        $.defer_statement,
        $.if_statement,
        $.for_statement,
        $.loop_statement,
        $.break_statement,
        $.continue_statement,
        $.expression_statement,
      ),

    let_statement: ($) =>
      seq(
        "let",
        field("name", $.identifier),
        optional(seq(":", field("type", $.type))),
        "=",
        field("value", $.expression),
      ),

    const_statement: ($) =>
      seq(
        "const",
        field("name", $.identifier),
        optional(seq(":", field("type", $.type))),
        "=",
        field("value", $.expression),
      ),

    return_statement: ($) => prec.right(seq("return", optional($.expression))),

    defer_statement: ($) => seq("defer", $.expression),

    loop_statement: ($) => seq("loop", field("body", $.block)),

    break_statement: ($) => "break",

    continue_statement: ($) => "continue",

    if_statement: ($) =>
      seq(
        "if",
        choice(
          seq("(", field("condition", $.expression), ")"),
          field("condition", $.expression),
        ),
        field("consequence", choice($.block, $.expression)),
        optional(
          seq(
            "else",
            field("alternative", choice($.block, $.if_statement, $.expression)),
          ),
        ),
      ),

    for_statement: ($) =>
      seq(
        "for",
        choice(
          seq("(", field("pattern", $.identifier), "in", field("iterable", $.expression), ")"),
          seq(field("pattern", $.identifier), "in", field("iterable", $.expression)),
        ),
        field("body", $.block),
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
          field("left", $.expression),
          field("operator", choice("=", "+=")),
          field("right", $.expression),
        ),
      ),

    binary_expression: ($) =>
      choice(
        prec.left("coalesce", seq($.expression, "??", $.expression)),
        prec.left("logical_or", seq($.expression, "or", $.expression)),
        prec.left("logical_and", seq($.expression, "and", $.expression)),
        prec.left(
          "equality",
          seq($.expression, choice("==", "!="), $.expression),
        ),
        prec.left(
          "comparison",
          seq($.expression, choice("<", ">", "<=", ">="), $.expression),
        ),
        prec.left("range", seq($.expression, "..", optional($.expression))),
        prec.left(
          "bitwise_or",
          seq($.expression, "|", $.expression),
        ),
        prec.left(
          "bitwise_xor",
          seq($.expression, "^", $.expression),
        ),
        prec.left(
          "bitwise_and",
          seq($.expression, "&", $.expression),
        ),
        prec.left(
          "additive",
          seq($.expression, choice("+", "-"), $.expression),
        ),
        prec.left(
          "multiplicative",
          seq($.expression, choice("*", "/", "%"), $.expression),
        ),
      ),

    unary_expression: ($) =>
      prec(
        "unary",
        choice(
          seq("-", $.expression),
          seq("!", $.expression),
          seq("&", $.expression),
        ),
      ),

    cast_expression: ($) => prec.left(seq($.expression, "as", $.type)),

    match_expression: ($) =>
      seq(
        field("scrutinee", $.expression),
        "match",
        "{",
        repeat($.match_arm),
        "}",
      ),

    match_arm: ($) =>
      seq(
        field("pattern", $.pattern),
        "=>",
        field("body", $.expression),
        optional(","),
      ),

    pattern: ($) =>
      choice(
        $.wildcard_pattern,
        $.identifier_pattern,
        $.variant_pattern,
        "else",
      ),

    wildcard_pattern: ($) => "_",

    identifier_pattern: ($) => $.identifier,

    variant_pattern: ($) =>
      seq(
        optional(seq($.type_identifier, ".")),
        $.type_identifier,
        optional(
          seq(
            "(",
            optional(
              seq($.pattern, repeat(seq(",", $.pattern)), optional(",")),
            ),
            ")",
          ),
        ),
      ),

    if_expression: ($) =>
      prec.right(
        seq(
          "if",
          choice(
            seq("(", field("condition", $.expression), ")"),
            field("condition", $.expression),
          ),
          field("consequence", $.expression),
          optional(seq("else", field("alternative", $.expression))),
        ),
      ),

    primary_expression: ($) =>
      choice(
        $.identifier,
        $.type_identifier,
        $.number_literal,
        $.string_literal,
        $.char_literal,
        $.boolean_literal,
        $.null_literal,
        $.grouped_expression,
        $.tuple_expression,
        $.array_literal,
        $.struct_literal,
        $.anonymous_struct_literal,
        $.function_call,
        $.member_expression,
        $.index_expression,
        $.dereference_expression,
        $.optional_chain_expression,
      ),

    grouped_expression: ($) => seq("(", $.expression, ")"),

    tuple_expression: ($) =>
      seq(
        "(",
        $.expression,
        ",",
        optional(seq($.expression, repeat(seq(",", $.expression)))),
        optional(","),
        ")",
      ),

    array_literal: ($) =>
      seq(
        "[",
        choice(
          // Empty array
          seq(),
          // Repeat syntax: [value; count]
          seq($.expression, ";", $.expression),
          // List of elements
          seq($.expression, repeat(seq(",", $.expression)), optional(",")),
        ),
        "]",
      ),

    struct_literal: ($) =>
      seq(
        $.type_identifier,
        optional($.generic_arguments),
        "{",
        optional(
          seq(
            $._field_entry,
            repeat(seq(",", $._field_entry)),
            optional(","),
          ),
        ),
        "}",
      ),

    anonymous_struct_literal: ($) =>
      seq(
        ".",
        "{",
        optional(
          seq(
            $._field_entry,
            repeat(seq(",", $._field_entry)),
            optional(","),
          ),
        ),
        "}",
      ),

    _field_entry: ($) => choice($.field_initializer, $.field_shorthand),

    field_initializer: ($) =>
      seq(field("name", $.identifier), "=", field("value", $.expression)),

    field_shorthand: ($) => $.identifier,

    function_call: ($) =>
      prec(
        2,
        seq(
          field("function", choice($.identifier, $.member_expression)),
          "(",
          optional(
            seq($.expression, repeat(seq(",", $.expression)), optional(",")),
          ),
          ")",
        ),
      ),

    member_expression: ($) =>
      prec.left(
        "member",
        seq(
          $.expression,
          ".",
          choice($.identifier, $.type_identifier, $.number_literal),
        ),
      ),

    index_expression: ($) =>
      prec.left("member", seq($.expression, "[", $.expression, "]")),

    dereference_expression: ($) =>
      prec.left("member", seq($.expression, ".", "*")),

    optional_chain_expression: ($) =>
      prec.left(
        "member",
        seq($.expression, "?.", choice($.identifier, $.type_identifier)),
      ),

    // ===== LITERALS =====
    number_literal: ($) =>
      choice(
        /0x[0-9a-fA-F_]+/,
        /0b[01_]+/,
        /0o[0-7_]+/,
        /[0-9][0-9_]*(i8|i16|i32|i64|isize|u8|u16|u32|u64|usize)?/,
      ),

    string_literal: ($) =>
      seq('"', repeat(choice($.escape_sequence, /[^"\\]+/)), '"'),

    char_literal: ($) => seq("'", choice($.escape_sequence, /[^'\\]/), "'"),

    escape_sequence: ($) => /\\[nrt"'\\0]/,

    boolean_literal: ($) => choice("true", "false"),

    null_literal: ($) => "null",

    // ===== IDENTIFIERS =====
    identifier: ($) => /[a-z_][a-zA-Z0-9_]*/,

    type_identifier: ($) => /[A-Z][a-zA-Z0-9_]*/,

    // ===== COMMENTS =====
    line_comment: ($) => seq("//", /.*/),
  },
});

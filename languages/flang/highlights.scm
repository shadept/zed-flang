; FLang Tree-sitter Highlights
; =============================

; Comments
(line_comment) @comment

; Keywords
[
  "fn"
  "struct"
  "enum"
  "let"
  "const"
  "test"
] @keyword.storage

[
  "if"
  "else"
  "for"
  "in"
  "match"
  "return"
  "defer"
  "loop"
] @keyword.control

(break_statement) @keyword.control
(continue_statement) @keyword.control

[
  "import"
] @keyword.import

[
  "as"
  "and"
  "or"
] @keyword.operator

; Visibility and directives
(visibility_modifier) @keyword.modifier
(directive) @attribute

; Types
(primitive_type) @type.builtin

(type) @type

(generic_type_parameter) @type.parameter

; Struct definition
(struct_definition
  name: (type) @type.definition)

(struct_field
  name: (identifier) @property)

; Enum definition
(enum_definition
  name: (type) @type.definition)

(enum_variant
  name: (type) @type.variant)

; Function definition
(function_definition
  name: (identifier) @function.definition)

(parameter
  name: (identifier) @variable.parameter)

; Lambda expressions
(lambda_expression
  "fn" @keyword.function)

(lambda_param
  name: (identifier) @variable.parameter)

; Function calls
(function_call
  function: (identifier) @function.call)

(function_call
  function: (member_expression
    (identifier) @function.method))

; Member access
(member_expression
  "." @punctuation.delimiter
  (identifier) @property)

(member_expression
  "." @punctuation.delimiter
  (type) @type.variant)

; Variables
(let_statement
  name: (identifier) @variable)

(const_statement
  name: (identifier) @constant)

(const_declaration
  name: (identifier) @constant)

(for_statement
  pattern: (identifier) @variable)

; Test blocks
(test_block
  name: (string_literal) @string)

; Match patterns
(wildcard_pattern) @variable.builtin

(variant_pattern
  (type) @type.variant)

; Struct literals
(struct_literal
  (type) @type)

(field_initializer
  name: (identifier) @property)

(field_shorthand
  (identifier) @property)

; Literals
(number_literal) @number
(string_literal) @string
(char_literal) @string
(escape_sequence) @string.escape
(boolean_literal) @constant.builtin
(null_literal) @constant.builtin

; Operators
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "="
  "+="
  "=="
  "!="
  "<"
  ">"
  "<="
  ">="
  "!"
  "&"
  "^"
  "|"
  "??"
  "?."
  ".."
  "=>"
] @operator

; Punctuation
[
  "("
  ")"
] @punctuation.bracket

[
  "["
  "]"
] @punctuation.bracket

[
  "{"
  "}"
] @punctuation.bracket

[
  ","
  "."
  ":"
  ";"
  "?"
] @punctuation.delimiter

; Identifiers (fallback)
(identifier) @variable

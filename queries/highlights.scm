; FLang Tree-sitter Highlights
; =============================
; IMPORTANT: tree-sitter queries are last-match-wins for the same node.
; The (identifier) @variable fallback MUST be first so all specific
; patterns below override it.

; Identifiers (fallback)
(identifier) @variable

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
(named_type (identifier) @type)
(generic_type_parameter) @type.parameter
(generic_type_parameter (identifier) @type.parameter)
(generic_parameter (identifier) @type.parameter)

; Struct definition
(struct_definition
  name: (identifier) @type.definition)

(struct_field
  name: (identifier) @property)

; Enum definition
(enum_definition
  name: (identifier) @type.definition)

(enum_variant
  name: (identifier) @type.variant)

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

; Method call: obj.method(args)
(function_call
  function: (member_expression
    (identifier) @function.method
    (#match? @function.method "^[a-z_]")))

; Enum variant with payload in call: Type.Variant(args)
(function_call
  function: (member_expression
    (identifier) @type.variant
    (#match? @type.variant "^[A-Z]")))

; Enum variant access: Type.Variant
(member_expression
  (identifier) @type.variant
  (#match? @type.variant "^[A-Z]"))

; Property access: obj.field
(member_expression
  (identifier) @property
  (#match? @property "^[a-z_]"))

; Variables and constants
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
  (identifier) @type.variant)

; Struct literals
(struct_literal
  (identifier) @type)

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

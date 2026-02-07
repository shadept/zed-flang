; FLang Outline/Symbol Queries

; Functions
(function_definition
  name: (identifier) @name) @item

; Structs
(struct_definition
  name: (identifier) @name) @item

; Enums
(enum_definition
  name: (identifier) @name) @item

; Top-level constants
(const_declaration
  name: (identifier) @name) @item

; Test blocks
(test_block
  name: (string_literal) @name) @item

; FLang Indentation Rules

; Indent after opening braces
[
  (block)
  (struct_body)
  (enum_body)
  (match_expression)
] @indent

; Dedent at closing braces
[
  "}"
  "]"
  ")"
] @outdent

; Indent continuations
(parameter_list
  "(" @indent
  ")" @outdent)

(function_call
  "(" @indent
  ")" @outdent)

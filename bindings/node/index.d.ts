declare module "tree-sitter-sass" {
  export interface Language {
    name: string;
    language: unknown;
    nodeTypeInfo: NodeTypeInfo[];
  }

  interface NodeTypeInfo {
    type: string;
    named: boolean;
    fields?: Record<string, FieldInfo>;
    children?: ChildrenInfo;
    subtypes?: TypeInfo[];
  }

  interface FieldInfo {
    multiple: boolean;
    required: boolean;
    types: TypeInfo[];
  }

  interface ChildrenInfo {
    multiple: boolean;
    required: boolean;
    types: TypeInfo[];
  }

  interface TypeInfo {
    type: string;
    named: boolean;
  }

  const language: Language;
  export = language;
}

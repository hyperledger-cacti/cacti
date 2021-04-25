import {
  ChainCodeLanguageRuntime,
  ChainCodeProgrammingLanguage,
} from "../generated/openapi/typescript-axios";

export function sourceLangToRuntimeLang(
  srcLanguage: ChainCodeProgrammingLanguage,
): ChainCodeLanguageRuntime {
  switch (srcLanguage) {
    case ChainCodeProgrammingLanguage.Javascript:
    case ChainCodeProgrammingLanguage.Typescript:
      return ChainCodeLanguageRuntime.Node;
    case ChainCodeProgrammingLanguage.Golang:
      return ChainCodeLanguageRuntime.Golang;
    case ChainCodeProgrammingLanguage.Java:
      return ChainCodeLanguageRuntime.Java;
    default: {
      throw new Error(`Cannot map: ${srcLanguage} to runtime language.`);
    }
  }
}

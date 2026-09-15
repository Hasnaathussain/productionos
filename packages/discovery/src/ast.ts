import * as ts from "typescript";
import type { AstFileFact, AstSummary } from "../../../packages/core/src/index.js";

interface SourceFileInput {
  path: string;
  content: string;
}

export function analyzeTypeScriptFiles(files: SourceFileInput[]): AstSummary {
  const facts: AstFileFact[] = [];
  for (const file of files.filter((candidate) => /\.(?:ts|tsx)$/.test(candidate.path))) {
    const source = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true, file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const imports = new Set<string>();
    const exports = new Set<string>();
    const calls = new Set<string>();
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) imports.add(node.moduleSpecifier.text);
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) exports.add(node.moduleSpecifier.text);
      if (ts.isFunctionDeclaration(node) && node.name && node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) exports.add(node.name.text);
      if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression)) calls.add(node.expression.text);
        else if (ts.isPropertyAccessExpression(node.expression)) calls.add(`${node.expression.expression.getText(source)}.${node.expression.name.text}`);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    facts.push({ path: file.path, imports: [...imports].sort(), exports: [...exports].sort(), calls: [...calls].sort() });
  }
  return { parser: "typescript", parserVersion: ts.version, files: facts.sort((left, right) => left.path.localeCompare(right.path)) };
}

'use client';
import { useRef } from 'react';
import Editor from '@monaco-editor/react';

export default function MonacoEditor({ value, onChange, language = 'latex' }) {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Custom LaTeX theme
    monaco.editor.defineTheme('latex-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
      ],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.foreground': '#d4d4d4',
        'editorLineNumber.foreground': '#858585',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
      },
    });

    monaco.editor.setTheme('latex-dark');

    // Enhanced LaTeX snippets
    monaco.languages.registerCompletionItemProvider('latex', {
      provideCompletionItems: () => ({
        suggestions: [
          {
            label: 'document',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\documentclass{${1:article}}\n\n\\begin{document}\n\t$0\n\\end{document}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Complete document structure',
          },
          {
            label: 'begin',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\begin{${1:environment}}\n\t$0\n\\end{${1:environment}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Begin environment',
          },
          {
            label: 'section',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\section{${1:title}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create section',
          },
          {
            label: 'subsection',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\subsection{${1:title}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create subsection',
          },
          {
            label: 'itemize',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\begin{itemize}\n\t\\item $0\n\\end{itemize}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Bullet list',
          },
          {
            label: 'enumerate',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\begin{enumerate}\n\t\\item $0\n\\end{enumerate}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Numbered list',
          },
          {
            label: 'equation',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\begin{equation}\n\t$0\n\\end{equation}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Math equation',
          },
          {
            label: 'frac',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\frac{${1:numerator}}{${2:denominator}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Fraction',
          },
          {
            label: 'sqrt',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\sqrt{${1:expression}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Square root',
          },
          {
            label: 'textbf',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\textbf{${1:text}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Bold text',
          },
          {
            label: 'textit',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\textit{${1:text}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Italic text',
          },
          {
            label: 'href',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\href{${1:url}}{${2:text}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Hyperlink',
          },
        ],
      }),
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
      const selection = editor.getSelection();
      const text = editor.getModel().getValueInRange(selection);
      editor.executeEdits('', [{
        range: selection,
        text: `\\textbf{${text}}`,
      }]);
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      const selection = editor.getSelection();
      const text = editor.getModel().getValueInRange(selection);
      editor.executeEdits('', [{
        range: selection,
        text: `\\textit{${text}}`,
      }]);
    });
  };

  return (
    <Editor
      height="100%"
      language={language}
      theme="latex-dark"
      value={value}
      onMount={handleEditorDidMount}
      onChange={(val) => onChange(typeof val === 'string' ? val : '')}
      options={{
        fontSize: 14,
        fontFamily: "'Fira Code', 'Consolas', monospace",
        fontLigatures: true,
        minimap: { enabled: true },
        wordWrap: 'on',
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        snippetSuggestions: 'top',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderWhitespace: 'selection',
        padding: { top: 16, bottom: 16 },
      }}
    />
  );
}
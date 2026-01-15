'use client';
import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';

export default function MonacoEditor({ value, onChange, language = 'latex' }) {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register LaTeX language snippets
    monaco.languages.registerCompletionItemProvider('latex', {
      provideCompletionItems: () => {
        const suggestions = [
          {
            label: 'begin',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\begin{${1:environment}}\n\t$0\n\\end{${1:environment}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Begin a LaTeX environment'
          },
          {
            label: 'section',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\section{${1:title}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a section'
          },
          {
            label: 'subsection',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\subsection{${1:title}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Create a subsection'
          },
          {
            label: 'frac',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\frac{${1:numerator}}{${2:denominator}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Fraction'
          },
          {
            label: 'sqrt',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: '\\sqrt{${1:expression}}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Square root'
          },
        ];

        return { suggestions };
      }
    });
  };

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={onChange}
      theme="vs-dark"
      options={{
        fontSize: 14,
        minimap: { enabled: true },
        wordWrap: 'on',
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        formatOnPaste: true,
        formatOnType: true,
      }}
      onMount={handleEditorDidMount}
    />
  );
}


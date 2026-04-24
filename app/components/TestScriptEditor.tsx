'use client';

import { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

interface TestScriptEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string | number;
  /** Context injected into autocomplete (function name, class name, etc.) */
  functionName?: string;
  className?: string;
  solutionType?: 'function' | 'class' | 'bebas';
}

// ─────────────────────────────────────────────────────────────────────────────
// Snippet / completion definitions
// ─────────────────────────────────────────────────────────────────────────────

function buildCompletionItems(
  monaco: typeof Monaco,
  range: Monaco.IRange,
  functionName: string,
  className: string,
  solutionType: string
): Monaco.languages.CompletionItem[] {
  const fn = functionName || 'solve';
  const cls = className || 'Solution';

  // Helper to make a snippet item
  const snippet = (
    label: string,
    insertText: string,
    detail: string,
    documentation: string,
    sortPrefix = '0'
  ): Monaco.languages.CompletionItem => ({
    label,
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail,
    documentation: { value: documentation, isTrusted: true },
    range,
    sortText: sortPrefix + label,
  });

  // Helper for keyword item
  const keyword = (
    label: string,
    insertText: string,
    detail: string
  ): Monaco.languages.CompletionItem => ({
    label,
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText,
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    detail,
    range,
    sortText: '1' + label,
  });

  const common: Monaco.languages.CompletionItem[] = [
    // ── Assert snippets ──────────────────────────────────────────────────────
    snippet(
      'assert == (equals)',
      'assert ${1:expr} == ${2:expected}, "${3:pesan error}"',
      '🔍 Assert kesetaraan',
      '`assert expr == expected, "pesan"` — Uji bahwa dua nilai sama.'
    ),
    snippet(
      'assert != (not equals)',
      'assert ${1:expr} != ${2:expected}, "${3:pesan error}"',
      '🔍 Assert tidak sama',
      '`assert expr != expected, "pesan"` — Uji bahwa dua nilai berbeda.'
    ),
    snippet(
      'assert > (greater than)',
      'assert ${1:expr} > ${2:value}, "${3:pesan error}"',
      '🔍 Assert lebih besar',
      '`assert expr > value, "pesan"`'
    ),
    snippet(
      'assert >= (greater or equal)',
      'assert ${1:expr} >= ${2:value}, "${3:pesan error}"',
      '🔍 Assert lebih besar atau sama',
      '`assert expr >= value, "pesan"`'
    ),
    snippet(
      'assert < (less than)',
      'assert ${1:expr} < ${2:value}, "${3:pesan error}"',
      '🔍 Assert lebih kecil',
      '`assert expr < value, "pesan"`'
    ),
    snippet(
      'assert <= (less or equal)',
      'assert ${1:expr} <= ${2:value}, "${3:pesan error}"',
      '🔍 Assert lebih kecil atau sama',
      '`assert expr <= value, "pesan"`'
    ),
    snippet(
      'assert is None',
      'assert ${1:expr} is None, "${2:harus bernilai None}"',
      '🔍 Assert bernilai None',
      'Memeriksa bahwa nilai adalah `None`.'
    ),
    snippet(
      'assert is not None',
      'assert ${1:expr} is not None, "${2:tidak boleh None}"',
      '🔍 Assert tidak None',
      'Memeriksa nilai bukan `None`.'
    ),
    snippet(
      'assert isinstance',
      'assert isinstance(${1:expr}, ${2:type}), "${3:tipe tidak sesuai}"',
      '🔍 Assert tipe data',
      'Memeriksa bahwa `expr` adalah instance dari `type`.\nContoh: `isinstance(result, list)`'
    ),
    snippet(
      'assert in (contains)',
      'assert ${1:item} in ${2:container}, "${3:item tidak ditemukan}"',
      '🔍 Assert ada dalam koleksi',
      'Memeriksa bahwa `item` ada di dalam list/set/dict/string.'
    ),
    snippet(
      'assert not in',
      'assert ${1:item} not in ${2:container}, "${3:item tidak boleh ada}"',
      '🔍 Assert tidak ada dalam koleksi',
      'Memeriksa bahwa `item` tidak ada di dalam container.'
    ),
    snippet(
      'assert len ==',
      'assert len(${1:collection}) == ${2:n}, "${3:panjang harus ${2:n}}"',
      '🔍 Assert panjang koleksi',
      'Memeriksa panjang/ukuran list, string, atau koleksi lainnya.'
    ),
    snippet(
      'assert raises (try/except)',
      [
        'try:',
        '    ${1:expr}',
        '    assert False, "Seharusnya memunculkan ${2:Exception}"',
        'except ${2:Exception}:',
        '    pass  # Test lulus — exception muncul sesuai harapan',
      ].join('\n'),
      '⚡ Assert exception dimunculkan',
      'Template untuk menguji bahwa kode memunculkan exception tertentu.'
    ),
    snippet(
      'assert almost equal (float)',
      'assert abs(${1:result} - ${2:expected}) < ${3:1e-9}, "${4:nilai float tidak presisi}"',
      '🔍 Assert float hampir sama',
      'Untuk membandingkan bilangan float dengan toleransi presisi.'
    ),

    // ── print / utility ──────────────────────────────────────────────────────
    snippet(
      'print lulus',
      'print("${1:Test lulus!}")',
      '📢 Print pesan sukses',
      'Cetak pesan saat semua pengujian lulus.'
    ),
    snippet(
      'print(f-string)',
      'print(f"${1:label}: {${2:value}}")',
      '📢 Print dengan f-string',
      'Cetak nilai dengan label menggunakan f-string.'
    ),

    // ── comment blocks ───────────────────────────────────────────────────────
    snippet(
      '# --- komentar test case ---',
      '# ── ${1:Deskripsi test case} ─────────────────────────────────────────\n$0',
      '💬 Komentar pemisah test case',
      'Blok komentar dekoratif untuk memisahkan kelompok pengujian.'
    ),
  ];

  // ── Context-specific snippets ──────────────────────────────────────────────
  const contextual: Monaco.languages.CompletionItem[] = [];

  if (solutionType === 'function') {
    contextual.push(
      snippet(
        `assert ${fn}() == (panggil fungsi)`,
        `assert ${fn}(\${1:args}) == \${2:expected}, "\${3:${fn}(\${1:args}) harus == \${2:expected}}"`,
        `🧩 Uji fungsi ${fn}`,
        `Panggil dan uji nilai kembalian fungsi \`${fn}\`.`,
        '00'
      ),
      snippet(
        `${fn}() = result variable`,
        `result = ${fn}(\${1:args})\nassert result == \${2:expected}, "\${3:hasil tidak sesuai}"`,
        `🧩 Simpan hasil ${fn} ke variabel`,
        `Simpan hasil \`${fn}\` ke variabel \`result\` lalu uji.`,
        '01'
      ),
      snippet(
        `loop assert ${fn}`,
        [
          '# Uji beberapa pasangan (input, output)',
          'test_cases = [',
          '    (${1:input1}, ${2:expected1}),',
          '    (${3:input2}, ${4:expected2}),',
          ']',
          `for args, expected in test_cases:`,
          `    result = ${fn}(args)`,
          '    assert result == expected, f"Input: {args}, Expected: {expected}, Got: {result}"',
          'print("Semua test lulus!")',
        ].join('\n'),
        `🔄 Loop assert ${fn} multi-input`,
        `Template loop untuk menguji ${fn} dengan banyak pasangan input/output.`,
        '02'
      )
    );
  }

  if (solutionType === 'class') {
    contextual.push(
      snippet(
        `obj = ${cls}() (inisialisasi)`,
        `obj = ${cls}(\${1:args})`,
        `🏗️ Inisialisasi class ${cls}`,
        `Buat instance dari class \`${cls}\`.`,
        '00'
      ),
      snippet(
        `assert obj.method()`,
        `assert obj.\${1:method}(\${2:args}) == \${3:expected}, "\${4:method tidak sesuai}"`,
        `🔍 Uji method class`,
        `Panggil method pada instance dan uji nilainya.`,
        '01'
      ),
      snippet(
        `full class test block`,
        [
          `# Test class ${cls}`,
          `obj = ${cls}(\${1:args})`,
          `assert obj is not None, "Inisialisasi gagal"`,
          ``,
          `# Uji method`,
          `assert obj.\${2:method}(\${3:args}) == \${4:expected}, "\${5:pesan error}"`,
          `print("Semua test lulus!")`,
        ].join('\n'),
        `🏗️ Template test class ${cls}`,
        `Blok lengkap: inisialisasi, uji method, dan print sukses.`,
        '02'
      )
    );
  }

  if (solutionType === 'bebas') {
    contextual.push(
      snippet(
        'import subprocess (run program)',
        [
          'import subprocess, sys',
          '',
          'result = subprocess.run(',
          '    [sys.executable, "-c", ${1:student_code}],',
          '    capture_output=True, text=True, timeout=10',
          ')',
          'assert result.returncode == 0, f"Program error: {result.stderr}"',
          'assert result.stdout.strip() == ${2:"expected output"}, \\',
          '    f"Output salah: {result.stdout.strip()!r}"',
        ].join('\n'),
        '⚙️ Jalankan program & cek stdout',
        'Template untuk menjalankan program sebagai subprocess dan membandingkan stdout-nya.'
      )
    );
  }

  // ── Python built-ins ──────────────────────────────────────────────────────
  const builtins: Monaco.languages.CompletionItem[] = [
    keyword('assert', 'assert ${1:condition}, "${2:pesan error}"', 'Python assert statement'),
    keyword('print', 'print(${1:value})', 'Python print()'),
    keyword('range', 'range(${1:stop})', 'Python range()'),
    keyword('len', 'len(${1:collection})', 'Python len()'),
    keyword('isinstance', 'isinstance(${1:obj}, ${2:type})', 'Python isinstance()'),
    keyword('type', 'type(${1:obj})', 'Python type()'),
    keyword('int', 'int(${1:value})', 'Python int()'),
    keyword('float', 'float(${1:value})', 'Python float()'),
    keyword('str', 'str(${1:value})', 'Python str()'),
    keyword('list', 'list(${1:iterable})', 'Python list()'),
    keyword('dict', 'dict(${1:kwargs})', 'Python dict()'),
    keyword('set', 'set(${1:iterable})', 'Python set()'),
    keyword('tuple', 'tuple(${1:iterable})', 'Python tuple()'),
    keyword('sorted', 'sorted(${1:iterable})', 'Python sorted()'),
    keyword('sum', 'sum(${1:iterable})', 'Python sum()'),
    keyword('max', 'max(${1:iterable})', 'Python max()'),
    keyword('min', 'min(${1:iterable})', 'Python min()'),
    keyword('abs', 'abs(${1:x})', 'Python abs()'),
    keyword('round', 'round(${1:number}, ${2:ndigits})', 'Python round()'),
    keyword('enumerate', 'enumerate(${1:iterable})', 'Python enumerate()'),
    keyword('zip', 'zip(${1:iter1}, ${2:iter2})', 'Python zip()'),
    keyword('map', 'map(${1:func}, ${2:iterable})', 'Python map()'),
    keyword('filter', 'filter(${1:func}, ${2:iterable})', 'Python filter()'),
    keyword('any', 'any(${1:iterable})', 'Python any()'),
    keyword('all', 'all(${1:iterable})', 'Python all()'),
  ];

  return [...contextual, ...common, ...builtins];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_ID = 'test-script-python-provider';

export default function TestScriptEditor({
  value,
  onChange,
  height = 260,
  functionName = '',
  className = '',
  solutionType = 'bebas',
}: TestScriptEditorProps) {
  // Keep a ref to the latest context so the provider closure sees fresh values
  const ctxRef = useRef({ functionName, className, solutionType });
  useEffect(() => {
    ctxRef.current = { functionName, className, solutionType };
  }, [functionName, className, solutionType]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Register custom completion provider for python (once; Monaco dedupes by language)
    try {
      monaco.languages.registerCompletionItemProvider('python', {
        triggerCharacters: ['.', '(', ' ', '\n', 'a', 's', 'e', 'r', 't', 'p', 'n', 'i'],
        provideCompletionItems(model: any, position: any) {
          const word = model.getWordUntilPosition(position);
          const range: Monaco.IRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const { functionName: fn, className: cls, solutionType: st } = ctxRef.current;
          return {
            suggestions: buildCompletionItems(monaco, range, fn, cls, st),
          };
        },
      });
    } catch {
      // Provider may already be registered on hot-reload — ignore
    }

    // Nice defaults for this editor instance
    editor.updateOptions({
      suggest: { showSnippets: true, filterGraceful: true },
      quickSuggestions: true, // Disable auto-popup as you type
      wordBasedSuggestions: 'currentDocument',
    });

    // Auto-focus
    editor.focus();
  };

  return (
    <div className="rounded border border-[#333333] bg-[#252526]">
      <Editor
        height={height}
        defaultLanguage="python"
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleEditorMount}
        options={{
          fontSize: 13,
          fontFamily: "'Fira Code', 'Courier New', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          lineNumbers: 'on',
          glyphMargin: false,
          folding: true,
          wordWrap: 'off',
          tabSize: 4,
          insertSpaces: true,
          renderLineHighlight: 'line',
          suggestOnTriggerCharacters: false, // Disable popup on '.' or '('
          acceptSuggestionOnEnter: 'off',    // Prevent Enter from selecting suggest
          tabCompletion: 'off',              // Prevent Tab from selecting suggest
          parameterHints: { enabled: true },
          formatOnType: true,
          autoIndent: 'full',
          bracketPairColorization: { enabled: true },
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          fixedOverflowWidgets: true, // Allow suggest widget to go outside editor box
        }}
      />
    </div>
  );
}

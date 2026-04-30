import fs from 'fs';
import path from 'path';
import Header from '../components/Header';
import { isAuthEnabled } from '@/lib/config';
import Link from 'next/link';
import MarkdownRenderer from '../components/MarkdownRenderer';

export default async function DocsPage() {
  const filePath = path.join(process.cwd(), 'docs', 'README.md');
  const content = fs.readFileSync(filePath, 'utf8');
  const authEnabled = isAuthEnabled();

  return (
    <div className="min-h-screen bg-[#1e1e1e]">
      <Header authEnabled={authEnabled} />
      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <Link href="/" className="text-green-500 hover:underline flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Kembali ke Beranda
          </Link>
        </div>
        <div className="bg-[#252526] border border-[#333333] rounded-lg p-8 shadow-xl">
          <MarkdownRenderer content={content} />
        </div>
      </main>
    </div>
  );
}

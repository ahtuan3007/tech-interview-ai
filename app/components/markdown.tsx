import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ source }: { source: string }) {
  return <div className="space-y-4 break-words text-sm leading-7 text-white/75 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-black/40 [&_pre]:p-4 [&_code]:font-mono [&_code]:text-emerald-200 [&_a]:text-amber-200 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-amber-200/40 [&_blockquote]:pl-4 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:border-white/15 [&_td]:px-3 [&_th]:border [&_th]:border-white/15 [&_th]:px-3">
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{source}</ReactMarkdown>
  </div>;
}

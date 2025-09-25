import React from 'react'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import rehypeKatex from 'rehype-katex'

export const MARKDOWN_REMARK = [remarkGfm, remarkBreaks, remarkMath]
export const MARKDOWN_REHYPE  = [[rehypeKatex, { output: 'html', strict: false }], rehypeRaw, rehypeSanitize]

export const MARKDOWN_COMPONENTS = {
  p: (props: any) => <p {...props} className="my-3" />,
  ul: (props: any) => <ul {...props} className="my-3 list-disc pl-6" />,
  ol: (props: any) => <ol {...props} className="my-3 list-decimal pl-6" />,
  li: (props: any) => <li {...props} className="[&>*]:align-baseline" />,
  h1: (props: any) => <h1 {...props} className="mt-6 mb-3 text-2xl font-bold" />,
  h2: (props: any) => <h2 {...props} className="mt-5 mb-3 text-xl font-bold" />,
  h3: (props: any) => <h3 {...props} className="mt-4 mb-2 text-lg font-semibold" />,
  table: (props: any) => <table {...props} className="min-w-full border border-black dark:border-gray-600 rounded-lg overflow-hidden my-6 shadow-lg" />,
  thead: (props: any) => <thead {...props} className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20" />,
  th: (props: any) => <th {...props} className="font-bold text-gray-900 dark:text-gray-100 px-4 py-3 border-b border-black dark:border-gray-600" />,
  tr: (props: any) => <tr {...props} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" />,
  td: (props: any) => <td {...props} className="px-4 py-3 border-b border-gray-200 dark:border-gray-700" />,
}
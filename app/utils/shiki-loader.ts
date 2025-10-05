import type { BundledLanguage, BundledTheme, HighlighterGeneric } from 'shiki';

let highlighterInstance: HighlighterGeneric<BundledLanguage, BundledTheme> | null = null;
let highlighterPromise: Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> | null = null;

const COMMON_LANGUAGES: BundledLanguage[] = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'html',
  'css',
  'json',
  'python',
  'shell',
  'markdown',
];

const DEFAULT_THEMES: BundledTheme[] = ['light-plus', 'dark-plus'];

export async function getHighlighter(): Promise<HighlighterGeneric<BundledLanguage, BundledTheme>> {
  if (highlighterInstance) {
    return highlighterInstance;
  }

  if (highlighterPromise) {
    return highlighterPromise;
  }

  highlighterPromise = (async () => {
    const { createHighlighter } = await import('shiki');

    const highlighter = await createHighlighter({
      langs: COMMON_LANGUAGES,
      themes: DEFAULT_THEMES,
    });

    highlighterInstance = highlighter;
    return highlighter;
  })();

  return highlighterPromise;
}

export async function loadLanguage(
  highlighter: HighlighterGeneric<BundledLanguage, BundledTheme>,
  lang: BundledLanguage
): Promise<void> {
  const loadedLanguages = highlighter.getLoadedLanguages();

  if (!loadedLanguages.includes(lang)) {
    try {
      await highlighter.loadLanguage(lang);
    } catch (error) {
      console.warn(`Failed to load language: ${lang}`, error);
    }
  }
}

export async function codeToHtml(
  code: string,
  options: {
    lang: BundledLanguage | string;
    theme?: BundledTheme;
  }
): Promise<string> {
  const { codeToHtml: shikiCodeToHtml, isSpecialLang } = await import('shiki');

  if (isSpecialLang(options.lang as any)) {
    return shikiCodeToHtml(code, {
      lang: options.lang as any,
      theme: options.theme || 'dark-plus',
    });
  }

  const highlighter = await getHighlighter();

  await loadLanguage(highlighter, options.lang as BundledLanguage);

  return highlighter.codeToHtml(code, {
    lang: options.lang,
    theme: options.theme || 'dark-plus',
  });
}

export { type BundledLanguage, type BundledTheme, type HighlighterGeneric };

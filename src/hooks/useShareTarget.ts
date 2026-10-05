import { useEffect, useState } from 'react';

export function useShareTarget(onUrlReceived: (url: string) => void) {
  const [incomingSharedText, setIncomingSharedText] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const textParam = params.get('text');
    const urlParam = params.get('url');
    const titleParam = params.get('title');

    const combinedCandidate = [urlParam, textParam, titleParam].filter(Boolean).join(' ');

    if (combinedCandidate) {
      // Extract HTTP/HTTPS URL
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const match = combinedCandidate.match(urlRegex);

      if (match && match[0]) {
        let extractedUrl = match[0].trim();
        // Remove trailing punctuation often appended by mobile share sheets (e.g. ')' or '.')
        extractedUrl = extractedUrl.replace(/[).,;]+$/, '');

        setIncomingSharedText(extractedUrl);
        onUrlReceived(extractedUrl);

        // Clean query params from the browser address bar to prevent repeated triggers on reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [onUrlReceived]);

  return { incomingSharedText };
}

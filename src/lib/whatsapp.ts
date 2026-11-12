// WhatsApp links: on desktop they open in a new tab (WhatsApp Web keeps the Detoke tab),
// on a phone they open in the same tab so the WhatsApp app launches and Back returns here.

/** Checked on every call: cheap, and right after a resize or rotation. */
export const isMobile = () => typeof window !== 'undefined' && matchMedia('(max-width: 639px)').matches;

/** `target` and `rel` for a WhatsApp link, by device. */
export const whatsappLinkProps = () => (isMobile() ? {} : { target: '_blank', rel: 'noreferrer' });

/** Opens WhatsApp; if the new tab is blocked (pop-up blocker), it opens in this tab instead. */
export const openWhatsApp = (url: string) => {
  if (isMobile() || !window.open(url, '_blank')) window.location.assign(url);
};

/**
 * For actions that wait for the server first (the checkout): on desktop the tab is opened right in the
 * click, when browsers allow it, and gets its address later. Call `go` with the URL, or `cancel` on error.
 */
export function prepareWhatsAppTab() {
  const tab = isMobile() ? null : window.open('', '_blank');
  return {
    go: (url: string) => {
      if (tab && !tab.closed) tab.location.href = url;
      else window.location.assign(url);
    },
    cancel: () => tab?.close(),
  };
}

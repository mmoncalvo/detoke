// WhatsApp links: on desktop they open in a new tab (WhatsApp Web keeps the Detoke tab),
// on a phone they open in the same tab so the WhatsApp app launches and Back returns here.
let mobile: boolean | null = null;

export const isMobile = () => {
  if (mobile === null && typeof window !== 'undefined') {
    mobile = matchMedia('(max-width: 639px)').matches;
  }
  return mobile ?? false;
};

export const openWhatsApp = (url: string) => {
  window.open(url, isMobile() ? '_self' : '_blank');
};

/**
 * The close button shared by every modal (dialogs and sheets): a dark gray circle with a white cross,
 * so it stays visible over any photo. It is a touch lighter than pure black so it reads well in both
 * light and dark mode, and a thin light ring keeps it apart from dark backgrounds.
 */
export const closeButtonClass =
  "absolute z-10 flex size-8 cursor-pointer items-center justify-center rounded-full bg-neutral-800 text-white shadow-md ring-1 ring-white/20 transition-colors hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0"

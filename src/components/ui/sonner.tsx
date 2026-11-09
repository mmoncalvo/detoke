"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Navbars: público h-16 (64 px) y dashboard h-14 (56 px), ambos sticky top-0, más el
// banner de impersonación opcional encima. En pantallas pequeñas los toasts empiezan
// justo debajo del navbar para no tapar los contadores de pedidos y carrito.
const OFFSET_DESKTOP = 12
const OFFSET_MOBILE = 72

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
      offset={{ top: OFFSET_DESKTOP }}
      mobileOffset={{ top: OFFSET_MOBILE }}
    />
  )
}

export { Toaster }

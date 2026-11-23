"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useEffect } from "react"
import { useTheme } from "@/context/ThemeContext"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Navbars: public h-16 (64 px) and dashboard h-14 (56 px), both sticky at the top, plus the optional
// impersonation banner above. On small screens toasts start right below the navbar so they do not
// cover the order and cart counters.
const OFFSET_DESKTOP = 12
const OFFSET_MOBILE = 72

// Sonner expands the stack on hover and pauses every timer while it is expanded. On touch screens a tap
// counts as a hover that never ends (there is no mouseleave), and with the mouse resting still over the
// stack it never ends either, so toasts stay forever. Sonner has no API to collapse the stack, so we
// replay the events it listens to: collapse when the user taps or clicks outside, or after a short
// time without pointer activity on the toasts. Collapsing resumes the timers.
const IDLE_COLLAPSE_MS = 2500
const CHECK_INTERVAL_MS = 500

function useAutoCollapse() {
  useEffect(() => {
    let lastActivity = Date.now()
    const getList = () => document.querySelector<HTMLElement>("[data-sonner-toaster]")
    const isExpanded = (list: HTMLElement) => list.querySelector('[data-sonner-toast][data-expanded="true"]') !== null

    const collapse = (list: HTMLElement) => {
      // Ends a pending "interacting" state (a touch that was cancelled by a scroll never sends pointerup),
      // then fires the mouseleave that makes Sonner collapse. Both on the list itself so the per-toast
      // swipe handlers are not involved; the second one waits for the first state update to render.
      list.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
      setTimeout(() => list.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body })), 0)
    }

    const onPointer = (event: PointerEvent) => {
      const list = getList()
      if (!list) return
      if (list.contains(event.target as Node)) {
        lastActivity = Date.now()
      } else if (event.type === "pointerdown" && isExpanded(list)) {
        collapse(list)
      }
    }

    const interval = setInterval(() => {
      const list = getList()
      if (list && isExpanded(list) && Date.now() - lastActivity > IDLE_COLLAPSE_MS) collapse(list)
    }, CHECK_INTERVAL_MS)

    document.addEventListener("pointerdown", onPointer, true)
    document.addEventListener("pointermove", onPointer, true)
    return () => {
      clearInterval(interval)
      document.removeEventListener("pointerdown", onPointer, true)
      document.removeEventListener("pointermove", onPointer, true)
    }
  }, [])
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  useAutoCollapse()

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

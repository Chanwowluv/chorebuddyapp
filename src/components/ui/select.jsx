"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

// Context for sharing mobile select state between components
const MobileSelectContext = React.createContext(null)

const Select = ({ value, onValueChange, children, open: controlledOpen, onOpenChange, ...props }) => {
  const isMobile = useIsMobile()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [selectedLabel, setSelectedLabel] = React.useState("")
  const [itemRegistry, setItemRegistry] = React.useState({})

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const registerItem = React.useCallback((itemValue, label) => {
    setItemRegistry(prev => {
      if (prev[itemValue] === label) return prev
      return { ...prev, [itemValue]: label }
    })
  }, [])

  if (isMobile) {
    return (
      <MobileSelectContext.Provider value={{ value, onValueChange, open, setOpen, selectedLabel, setSelectedLabel, itemRegistry, registerItem }}>
        {children}
      </MobileSelectContext.Provider>
    )
  }

  return (
    <MobileSelectContext.Provider value={null}>
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} open={controlledOpen} onOpenChange={onOpenChange} {...props}>
        {children}
      </SelectPrimitive.Root>
    </MobileSelectContext.Provider>
  )
}

const SelectGroup = React.forwardRef(({ className, children, ...props }, ref) => {
  const mobileCtx = React.useContext(MobileSelectContext)
  if (mobileCtx) {
    return <div ref={ref} className={className}>{children}</div>
  }
  return <SelectPrimitive.Group ref={ref} className={className} {...props}>{children}</SelectPrimitive.Group>
})
SelectGroup.displayName = "SelectGroup"

const SelectValue = React.forwardRef(({ placeholder, className }, ref) => {
  const mobileCtx = React.useContext(MobileSelectContext)
  if (mobileCtx) {
    const displayText = mobileCtx.itemRegistry?.[mobileCtx.value]
      || mobileCtx.selectedLabel
      || mobileCtx.value
    return (
      <span
        ref={ref}
        className={cn(
          "line-clamp-1",
          !displayText && "text-muted-foreground",
          className
        )}
      >
        {displayText || placeholder}
      </span>
    )
  }
  return <SelectPrimitive.Value ref={ref} placeholder={placeholder} className={className} />
})
SelectValue.displayName = "SelectValue"

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const mobileCtx = React.useContext(MobileSelectContext)

  if (mobileCtx) {
    return (
      <button
        ref={ref}
        type="button"
        onClick={() => mobileCtx.setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
        {...props}>
        {children}
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>
    )
  }

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const mobileCtx = React.useContext(MobileSelectContext)

  if (mobileCtx) {
    return (
      <DrawerPrimitive.Root open={mobileCtx.open} onOpenChange={mobileCtx.setOpen} shouldScaleBackground={false}>
        <DrawerPrimitive.Portal>
          <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" />
          <DrawerPrimitive.Content
            ref={ref}
            className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background pb-safe"
          >
            <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-1">
              {children}
            </div>
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Portal>
      </DrawerPrimitive.Root>
    )
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}>
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn("p-1", position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
})
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, children, ...props }, ref) => {
  const mobileCtx = React.useContext(MobileSelectContext)
  if (mobileCtx) {
    return (
      <div ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold", className)}>
        {children}
      </div>
    )
  }
  return (
    <SelectPrimitive.Label
      ref={ref}
      className={cn("px-2 py-1.5 text-sm font-semibold", className)}
      {...props} />
  )
})
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
  const mobileCtx = React.useContext(MobileSelectContext)

  // Register this item's label in the mobile context so SelectValue can look it up
  React.useEffect(() => {
    if (mobileCtx?.registerItem) {
      const label = typeof children === 'string' ? children : value
      mobileCtx.registerItem(value, label)
    }
  }, [mobileCtx, value, children])

  if (mobileCtx) {
    const isSelected = mobileCtx.value === value
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "relative flex w-full cursor-default items-center rounded-lg py-3 pl-4 pr-10 text-base outline-none active:bg-accent/80 transition-colors",
          isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
          className
        )}
        onClick={() => {
          mobileCtx.onValueChange?.(value)
          const label = typeof children === 'string' ? children : value
          mobileCtx.setSelectedLabel(label)
          mobileCtx.setOpen(false)
        }}
        {...props}>
        <span className="flex-1 text-left">{children}</span>
        {isSelected && (
          <span className="absolute right-3 flex h-4 w-4 items-center justify-center">
            <Check className="h-4 w-4" />
          </span>
        )}
      </button>
    )
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      value={value}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}>
      <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="h-4 w-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => {
  const mobileCtx = React.useContext(MobileSelectContext)
  if (mobileCtx) {
    return <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} />
  }
  return (
    <SelectPrimitive.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-muted", className)}
      {...props} />
  )
})
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}

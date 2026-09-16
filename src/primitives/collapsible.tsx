"use client";

import * as React from "react";
import { cn } from "../lib/utils";

const CollapsibleContext = React.createContext<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

const Collapsible = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        defaultOpen?: boolean;
    }
>(({ className, children, open: controlledOpen, onOpenChange, defaultOpen, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen || false);
    const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

    const handleOpenChange = (newOpen: boolean) => {
        if (controlledOpen === undefined) {
            setInternalOpen(newOpen);
        }
        onOpenChange?.(newOpen);
    };

    return (
        <div ref={ref} className={className} {...props}>
            <CollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
                {children}
            </CollapsibleContext.Provider>
        </div>
    );
});
Collapsible.displayName = "Collapsible";

const CollapsibleTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
    const { open, onOpenChange } = React.useContext(CollapsibleContext);

    if (asChild && React.isValidElement<React.HTMLAttributes<HTMLElement>>(children)) {
        return React.cloneElement(children, {
            ...props,
            "data-state": open ? "open" : "closed",
            onClick: (e: React.MouseEvent<HTMLElement>) => {
                onOpenChange(!open);
                children.props.onClick?.(e);
            },
        } as any);
    }

    return (
        <button
            ref={ref}
            type="button"
            data-state={open ? "open" : "closed"}
            className={className}
            onClick={() => onOpenChange(!open)}
            {...props}
        >
            {children}
        </button>
    );
});
CollapsibleTrigger.displayName = "CollapsibleTrigger";

const CollapsibleContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { open } = React.useContext(CollapsibleContext);

    if (!open) return null;

    return (
        <div
            ref={ref}
            data-state={open ? "open" : "closed"}
            className={cn("overflow-hidden", className)}
            {...props}
        >
            {children}
        </div>
    );
});
CollapsibleContent.displayName = "CollapsibleContent";

export { Collapsible, CollapsibleTrigger, CollapsibleContent };

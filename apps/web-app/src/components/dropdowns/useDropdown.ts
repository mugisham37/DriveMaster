import { useState, useRef, useEffect } from "react";

export interface UseDropdownReturn {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
  panelAttributes: {
    "aria-hidden": boolean;
    "aria-expanded": boolean;
  };
  buttonAttributes: {
    "aria-expanded": boolean;
    "aria-haspopup": boolean;
  };
}

export function useDropdown(): UseDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return {
    isOpen,
    toggle,
    close,
    open,
    panelAttributes: {
      "aria-hidden": !isOpen,
      "aria-expanded": isOpen,
    },
    buttonAttributes: {
      "aria-expanded": isOpen,
      "aria-haspopup": true,
    },
  };
}

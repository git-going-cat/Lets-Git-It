import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function Button({ children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`nes-rounded-button bg-blue-500 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`}
    >
      {children}
    </button>
  );
}

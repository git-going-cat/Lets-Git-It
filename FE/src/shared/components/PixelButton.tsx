const NES_VARIANT: Record<string, string> = {
  primary: 'is-success',
  secondary: 'is-primary',
  danger: 'is-error',
};

export interface PixelButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export default function PixelButton({ label, onClick, variant = 'secondary' }: PixelButtonProps) {
  return (
    <button type="button" className={`nes-btn ${NES_VARIANT[variant]}`} onClick={onClick}>
      {label}
    </button>
  );
}

import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";

export default function CoinPurseIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <circle cx="7" cy="6" r="2" />
      <circle cx="12" cy="4" r="2" />
      <circle cx="17" cy="6" r="2" />
      <path d="M5.3 8.8c0-.9.7-1.6 1.6-1.6h10.2c.9 0 1.6.7 1.6 1.6 0 .4-.2.8-.5 1.1l-1.2 1.2c2.1 1.2 3.4 3.5 3.4 6.1 0 3.8-3.1 6.8-6.9 6.8h-3c-3.8 0-6.9-3-6.9-6.8 0-2.6 1.3-4.9 3.4-6.1L5.8 9.9c-.3-.3-.5-.7-.5-1.1Z" />
    </SvgIcon>
  );
}

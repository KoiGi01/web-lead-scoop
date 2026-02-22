interface GlobaLeadsLogoProps {
  className?: string;
  size?: number;
}

export const GlobaLeadsLogo = ({ className = "", size = 24 }: GlobaLeadsLogoProps) => (
  <img
    src="/logo.svg"
    alt="GlobaLeads22"
    width={size}
    height={size}
    className={className}
    style={{ display: 'inline-block' }}
  />
);

export default GlobaLeadsLogo;

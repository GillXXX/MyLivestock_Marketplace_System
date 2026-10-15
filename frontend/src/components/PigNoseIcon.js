// Lucide has no pig icon (only "piggy-bank", a money icon) — this hand-drawn
// pig snout matches lucide's own viewBox/stroke conventions so it drops in
// next to real lucide icons without looking out of place.
function PigNoseIcon({ size = 24, strokeWidth = 2, color = "currentColor", ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="6" width="18" height="13" rx="6.5" />
      <ellipse cx="9" cy="12.5" rx="1.6" ry="2.3" fill={color} stroke="none" />
      <ellipse cx="15" cy="12.5" rx="1.6" ry="2.3" fill={color} stroke="none" />
    </svg>
  );
}

export default PigNoseIcon;

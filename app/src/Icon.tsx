export function Icon({
  name,
  size = 24,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <img
      className={`icon ${className}`}
      src={`/assets/${name}.png`}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  );
}

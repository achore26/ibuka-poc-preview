/* Supplied unmodified SVG artwork. Horizontal >=120px, icon >=24px.
 * Call sites reserve half the displayed SVG/icon height as clear space,
 * conservatively including the original artwork's internal whitespace.
 * Each active viewport has one accessible CMP Kenya identity; hidden
 * desktop/mobile alternatives do not recreate or retype the wordmark. */

const HORIZONTAL_HEIGHT_RATIO = 106 / 309.9914285714286;
const ICON_HEIGHT_RATIO = 106 / 96;

export function BrandLogo({
  lockup = "horizontal",
  tone = "primary",
  width,
  labelled = true,
  className = "",
}: {
  lockup?: "horizontal" | "icon";
  tone?: "primary" | "reversed";
  width: number;
  labelled?: boolean;
  className?: string;
}) {
  const height = Math.round(width * (lockup === "horizontal" ? HORIZONTAL_HEIGHT_RATIO : ICON_HEIGHT_RATIO) * 10) / 10;
  return (
    <img
      src={`/brand/cmp-kenya_${lockup === "horizontal" ? "logo_horizontal" : "icon"}_${tone}.svg`}
      alt={labelled ? "CMP Kenya" : ""}
      width={width}
      height={height}
      className={className}
    />
  );
}

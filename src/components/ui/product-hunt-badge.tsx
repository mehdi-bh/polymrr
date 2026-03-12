const PH_LINK =
  "https://www.producthunt.com/products/polymrr?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-polymrr";
const PH_IMAGE_LIGHT =
  "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1094275&theme=light&t=1773179471587";

export function ProductHuntBadge({ className }: { className?: string }) {
  return (
    <a
      href={PH_LINK}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block transition-transform hover:scale-105 ${className ?? ""}`}
    >
      <img
        src={PH_IMAGE_LIGHT}
        alt="PolyMRR on Product Hunt"
        width={250}
        height={54}
        className="h-[54px] w-[250px] rounded-lg"
      />
    </a>
  );
}


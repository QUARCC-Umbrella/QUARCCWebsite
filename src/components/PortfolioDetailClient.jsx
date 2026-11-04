import FundFactsheet from "./fund/FundFactsheet.jsx";
import useLivePortfolios from "./fund/useLivePortfolios.js";

export default function PortfolioDetailClient({ portfolio }) {
  const [live] = useLivePortfolios([portfolio]);
  return <FundFactsheet portfolio={live} />;
}

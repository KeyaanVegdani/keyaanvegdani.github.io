import DitherFilter from "./DitherFilter";
import RotatingLogo from "./RotatingLogo";
import Snowfall from "./Snowfall";
import { skyCss } from "./sky";

export default function Home() {
  return (
    <main className="main-frame relative flex flex-1 items-center justify-center" style={{ backgroundImage: skyCss() }}>
      <DitherFilter />
      <Snowfall />
      <RotatingLogo />
    </main>
  );
}

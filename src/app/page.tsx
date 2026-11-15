import DitherFilter from "./DitherFilter";
import RotatingLogo from "./RotatingLogo";
import Snowfall from "./Snowfall";
import { skyCss } from "./sky";

export default function Home() {
  return (
    <main className="main-frame relative flex flex-1 items-center justify-center" style={{ backgroundImage: skyCss() }}>
      <DitherFilter />
      <Snowfall />
      {/* Opens search / command menu (not built yet). Design: Figma node 50:10. */}
      <button type="button" className="cmdk-button" aria-label="Search (Command K)">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/search.svg" alt="" width={12} height={12} />
        <span>CMD + K</span>
      </button>
      <RotatingLogo />
      {/* Intro line under the logos. Design: Figma node 50:17. */}
      <p className="intro-text">
        Keyaan is a motion &amp; brand designer, working to make our world just a bit more{" "}
        <span className="intro-magic">magical</span>
      </p>
    </main>
  );
}

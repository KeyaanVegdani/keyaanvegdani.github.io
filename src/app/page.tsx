import DitherFilter from "./DitherFilter";
import Fox from "./Fox";
import IpodPopup from "./IpodPopup";
import Playground from "./Playground";
import RotatingLogo from "./RotatingLogo";
import ScrollFx from "./ScrollFx";
import Snowfall from "./Snowfall";
import { skyCss } from "./sky";

export default function Home() {
  return (
    <main className="main-frame relative flex flex-1 flex-col" style={{ backgroundImage: skyCss() }}>
      <ScrollFx />
      <div className="frame-gutter is-left" aria-hidden />
      <div className="frame-gutter is-right" aria-hidden />
      <DitherFilter />
      {/* First screen: everything here is laid out against this section, so
          it looks the same however tall the page gets. */}
      <section className="hero relative flex items-center justify-center">
        <Snowfall />
        <Fox />
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
          <span className="intro-magic">
            magical
            <span className="intro-dot" aria-hidden />
          </span>
        </p>
        <IpodPopup />
      </section>
      {/* Below the first screen: the spread of playground cards. */}
      <Playground />
    </main>
  );
}

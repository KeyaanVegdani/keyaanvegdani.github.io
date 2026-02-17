document.addEventListener("DOMContentLoaded", () => {

  const content = document.getElementById("content");

  function removeClickable(el) {
    el.classList.remove("clickable-word");
    el.outerHTML = el.textContent;
  }

  function getCurrentAge() {
    const birthDate = new Date("2004-11-13T00:00:00");
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const hasHadBirthday = now >= new Date(now.getFullYear(), 10, 13);
    if (!hasHadBirthday) age--;
    return age;
  }

  // STEP 1
  document.getElementById("keyaan").onclick = function () {
    const parent = this.parentElement;
    removeClickable(this);

    parent.innerHTML =
      'My name is <span class="clickable-word" id="full-name">Keyaan Vegdani</span>.';

    // STEP 2
    document.getElementById("full-name").onclick = function () {
      const parent = this.parentElement;
      removeClickable(this);

      parent.innerHTML +=
        ' I grew up in <span class="clickable-word" id="vancouver">Vancouver</span>, BC, Canada.';

      // STEP 3
      document.getElementById("vancouver").onclick = function () {
        const parent = this.parentElement;
        removeClickable(this);

        parent.innerHTML +=
          ' Where I spent summer nights staring at the mountains and the <span class="clickable-word" id="stars">stars</span> imagining <span class="clickable-word" id="stories">stories</span> in my head.';

        setupStars();
        setupStories();
      };
    };
  };

  function setupStars() {
    document.getElementById("stars").onclick = function () {
      removeClickable(this);

      const p = document.createElement("p");
      p.innerHTML =
        `I'm a scorpio — if that matters to you — and I'm ${getCurrentAge()} <span class="clickable-word" id="years-old">years old</span>.`;
      content.appendChild(p);

      // STEP 5
      document.getElementById("years-old").onclick = function () {
        const parent = this.parentElement;
        removeClickable(this);

        parent.innerHTML +=
          ' <span class="clickable-word" id="unless">Unless</span> I am dead.';

        document.getElementById("unless").onclick = function () {
          const parent = this.parentElement;
          removeClickable(this);

          parent.innerHTML +=
            ' This clanker just presumes that I am alive, and will forever as long as <span class="clickable-word" id="github">GitHub exists</span>.';

          document.getElementById("github").onclick = function () {
            const parent = this.parentElement;
            removeClickable(this);

            parent.innerHTML +=
              ' Or the internet, whichever gives out first.';
          };
        };
      };
    };
  }

  function setupStories() {
    document.getElementById("stories").onclick = function () {
      removeClickable(this);

      const p = document.createElement("p");
      p.innerHTML =
        'At 16, I wrote and illustrated my first ever <span class="clickable-word" id="book">children\'s book</span>.';
      content.appendChild(p);

      document.getElementById("book").onclick = function () {
        const parent = this.parentElement;
        removeClickable(this);

        parent.innerHTML +=
          ' <span class="clickable-word" id="it-was">It was</span> bad.';

        document.getElementById("it-was").onclick = function () {
          removeClickable(this);

          const p2 = document.createElement("p");
          p2.innerHTML =
            'But, I wrote <span class="clickable-word" id="better">better</span> ones, like <a href="https://www.amazon.ca/My-Crohns-Bucket-Keyaan-Vegdani/dp/B09CRN23TD" target="_blank">My Crohn\'s Bucket</a>.';
          content.appendChild(p2);

          document.getElementById("better").onclick = function () {
            removeClickable(this);

            const p3 = document.createElement("p");
            p3.innerHTML =
              '<span class="clickable-word" id="pondering">Pondering</span> the intersection of both the images and text on each page eventually led me to <span class="clickable-word" id="design">design</span>.';
            content.appendChild(p3);

        document.getElementById("design").onclick = function () {
        const parent = this.parentElement;
        removeClickable(this);

        parent.innerHTML +=
            ' Where I\'m currently studying <span class="clickable-word" id="iat">Interactive Art and Technology</span> + Business @ Simon Fraser University.';

        document.getElementById("iat").onclick = function () {
            const parent = this.parentElement;
            removeClickable(this);

            parent.innerHTML +=
            ' To be <span class="clickable-word" id="honest">honest</span>, I don\'t really know what Interactive Arts and Technology is.';

            document.getElementById("honest").onclick = function () {
            const parent = this.parentElement;
            removeClickable(this);

            parent.innerHTML +=
                ' I usually say its a <span class="clickable-word" id="mixture">mixture</span> of design, 3D modelling, animation, and coding.';

            document.getElementById("mixture").onclick = function () {
                const parent = this.parentElement;
                removeClickable(this);

                parent.innerHTML +=
                ' Like a blender of everything creative.';
            };
            };
        };
        };


            document.getElementById("pondering").onclick = function () {
              removeClickable(this);

              const p4 = document.createElement("p");
              p4.innerHTML =
                'I do most of my pondering while listening to <span class="clickable-word" id="music">music</span> or <span class="clickable-word" id="podcasts">podcasts</span>.';
              content.appendChild(p4);

              setupMusic();
              setupPodcasts();
            };
          };
        };
      };
    };
  }

  function setupMusic() {
    document.getElementById("music").onclick = function () {
      removeClickable(this);

      const p = document.createElement("p");
      p.innerHTML =
        'My favourite artists are Keshi, Laufey, and Beabadoobee. Which some say makes me a <span class="clickable-word" id="red-flag">red flag</span>.';
      content.appendChild(p);

      document.getElementById("red-flag").onclick = function () {
        const parent = this.parentElement;
        removeClickable(this);

        parent.innerHTML +=
          ' I <span class="clickable-word" id="dont">don\'t</span> think I am tho.';

        document.getElementById("dont").onclick = function () {
          const parent = this.parentElement;
          removeClickable(this);

          parent.innerHTML +=
            ' I do play <span class="clickable-word" id="valorant">Valorant</span> though.';

          document.getElementById("valorant").onclick = function () {
            const parent = this.parentElement;
            removeClickable(this);

            parent.innerHTML = parent.innerHTML.replace(
              'I do play Valorant though.',
              'I do <span class="clickable-word" id="suck">suck</span> at Valorant though.'
            );

            document.getElementById("suck").onclick = function () {
              const parent = this.parentElement;
              removeClickable(this);

              parent.innerHTML +=
                ' I drop an average of 5 kills per game.';
            };
          };
        };
      };
    };
  }

  function setupPodcasts() {
    document.getElementById("podcasts").onclick = function () {
      removeClickable(this);

      const p = document.createElement("p");
      p.innerHTML =
        'Like <span class="clickable-word" id="rotten">Rotten Mango</span> by Stephanie Soo.';
      content.appendChild(p);

      document.getElementById("rotten").onclick = function () {
        const parent = this.parentElement;
        removeClickable(this);

        parent.innerHTML +=
          ' Although, I prefer to eat my mangos not rotten.';
      };
    };
  }





    // ---------- HELLO SECTION ----------

    const hello = document.getElementById("hello");

    hello.onclick = function () {
    const parent = this.parentElement;
    removeClickable(this);

    parent.innerHTML +=
        ' How are you <span class="clickable-word" id="doing">doing</span>?';

    document.getElementById("doing").onclick = function () {
        const parent = this.parentElement;
        removeClickable(this);

        parent.innerHTML +=
        ' Personally, I\'m currently feeling like this <span class="clickable-word" id="gif-word">GIF</span>.';

        setupGifWord();
    };
    };
function setupGifWord() {
  const gifWord = document.getElementById("gif-word");

  let hoverGif = null;
  let hasClicked = false; // 👈 one-time click guard

  function cleanupHoverGif() {
    if (hoverGif) {
      hoverGif.remove();
      hoverGif = null;
    }
  }

  // --- HOVER (always active) ---
  gifWord.addEventListener("mouseenter", () => {
    const gifNumber = Math.floor(Math.random() * 6) + 1;

    hoverGif = document.createElement("img");
    hoverGif.src = `assets/Gif${gifNumber}.gif`;
    hoverGif.className = "gif-hover";

    document.body.appendChild(hoverGif);
  });

  gifWord.addEventListener("mousemove", (e) => {
    if (!hoverGif) return;
    hoverGif.style.left = e.clientX + "px";
    hoverGif.style.top = e.clientY + "px";
  });

  gifWord.addEventListener("mouseleave", cleanupHoverGif);

  // --- CLICK (one time only) ---
  gifWord.onclick = function () {
    if (hasClicked) return; // 🚫 block extra clicks
    hasClicked = true;

    cleanupHoverGif(); // remove image immediately
    this.classList.remove("clickable-word");

    const text = document.createTextNode(
      " This snippet of code cycles through my favourite gifs on hover."
    );
    this.parentElement.appendChild(text);
  };
}

// ---------- PRODUCT DESIGNER SECTION ----------

const pd = document.getElementById("pd");

pd.onclick = function () {
  const parent = this.parentElement;
  removeClickable(this);

  parent.innerHTML +=
    ' I\'m <span class="clickable-word" id="currently">currently</span> designing on the FC team at <a href="https://www.ea.com/" target="_blank">Electronic Arts</a>.';

  setupCurrently(parent);
};

function setupCurrently(parent) {
  document.getElementById("currently").onclick = function () {
    removeClickable(this);

    parent.innerHTML +=
      ' <span class="clickable-word" id="previously">Previously</span>, I was a design intern at the <a href="https://www.asc-csa.gc.ca/eng/" target="_blank">Canadian Space Agency</a>, where I worked on an <span class="clickable-word" id="internal-tool">internal expertise tool</span>.';

    setupPreviously(parent);
    setupInternalTool(parent);
  };
}

function setupPreviously(parent) {
  const previously = document.getElementById("previously");

  previously.onclick = function () {
    // remove underline + click styling, but keep text
    previously.classList.remove("clickable-word");

    const p = document.createElement("p");
    p.innerHTML =
      'I\'m also leading design on Western Canada\'s biggest hackathon.';

    // 👇 append below the current content safely
    parent.parentElement.appendChild(p);
  };
}



function setupInternalTool() {
  const tool = document.getElementById("internal-tool");

  tool.onclick = function () {
    const parent = tool.parentNode;

    // Find and remove the text node containing "where I worked on an "
    parent.childNodes.forEach(node => {
      if (
        node.nodeType === Node.TEXT_NODE &&
        node.textContent.includes("where I worked on an")
      ) {
        parent.removeChild(node);
      }
    });

    // Insert correct replacement text
    parent.insertBefore(
      document.createTextNode(", where I saw "),
      tool
    );

    // Replace tool span with aliens span
    const aliens = document.createElement("span");
    aliens.id = "aliens";
    aliens.className = "clickable-word";
    aliens.textContent = "aliens";

    tool.replaceWith(aliens);

    setupAliens(aliens);
  };
}



function setupAliens(aliensSpan) {
  aliensSpan.onclick = function () {
    this.classList.remove("clickable-word");

    const joke = document.createTextNode(
      " (For legal reasons, this is a joke)"
    );
    this.after(joke);
  };
}







});

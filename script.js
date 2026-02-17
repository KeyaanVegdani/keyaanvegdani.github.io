// Define section themes
const sectionThemes = {
    'asana': {
        navBg: '#1C1C3C',
        navText: '#9CA9D0'
    },
    'google': {
        navBg: '#35494B',
        navText: '#DAE7E9'
    },
    'bawl': {
        navBg: '#181814',
        navText: '#D4D4D4'
    }
};

// Get the nav element
const nav = document.querySelector('nav');
const sections = document.querySelectorAll('section');

function updateNavTheme() {
    const navHeight = nav.offsetHeight;
    const scrollPosition = window.scrollY + navHeight;
    
    // Find which section we're currently in
    let currentSection = null;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;
        
        if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            currentSection = section;
        }
    });
    
    if (currentSection) {
        const sectionClass = currentSection.className.split(' ')[0];
        const theme = sectionThemes[sectionClass];
        
        if (theme) {
            // Set CSS custom properties instead of inline styles
            document.documentElement.style.setProperty('--nav-bg', theme.navBg);
            document.documentElement.style.setProperty('--nav-text', theme.navText);
        }
    }
}

window.addEventListener('scroll', updateNavTheme);
updateNavTheme();





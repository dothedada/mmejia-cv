import '../css/style.css';

//set lang
const initializeLang = () => {
    let lang = localStorage.getItem('lang') || navigator.language.slice(0, 2);
    lang = lang === 'es' ? 'es' : 'en';
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
    return lang;
};
initializeLang();

const toggleLang = () => {
    let lang = localStorage.getItem('lang');
    menuLang.textContent = `(${lang?.toUpperCase()})`;
    lang = lang === 'es' ? 'en' : 'es';
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
};

// menu
const menuLang = document.querySelector<HTMLButtonElement>('.menu__lang')!;
const menuBtn = document.querySelector<HTMLButtonElement>('.menu__show')!;
const menuLinks = document.querySelector<HTMLUListElement>('.menu__links')!;

menuLang.addEventListener('pointerdown', toggleLang);
menuBtn.addEventListener('pointerdown', () => {
    menuLinks.classList.toggle('visible');
    menuBtn.classList.toggle('view');
});
menuLinks.querySelectorAll('a').forEach((btn) => {
    btn.addEventListener('pointerdown', () => {
        menuLinks.classList.remove('visible');
        menuBtn.classList.toggle('view');
    });
});

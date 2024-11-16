import '../css/style.css';
import txtSR from './ui-sr_txt';
import fileFetcher from './fetcher';
import textTest from './testText.txt?raw';

console.log(textTest);
type Lang = 'es' | 'en';

const menuLang = document.querySelector<HTMLButtonElement>('.menu__lang')!;
const menuBtn = document.querySelector<HTMLButtonElement>('.menu__show')!;
const menuLinks = document.querySelector<HTMLUListElement>('.menu__links')!;

// lang
const getLang = (): Lang => {
    let lang = localStorage.getItem('lang') || navigator.language.slice(0, 2);
    return lang === 'es' ? 'es' : 'en';
};

const setLangButtonContent = (lang: Lang): void => {
    const srSpan = document.createElement('span');
    const txtSpan = document.createElement('span');
    menuLang.textContent = '';

    srSpan.textContent = txtSR[lang].langBtn;
    srSpan.classList.add('sr-only');
    txtSpan.textContent = `(${lang === 'es' ? 'En' : 'Es'})`;
    txtSpan.ariaHidden = 'true';

    menuLang.append(srSpan, txtSpan);
};

const setLang = (lang: Lang): void => {
    setLangButtonContent(lang);
    localStorage.setItem('lang', lang);
    document.documentElement.setAttribute('lang', lang);
};

const toggleLang = (): void => {
    const currentLang = getLang();
    const newLang: Lang = currentLang === 'es' ? 'en' : 'es';
    setLang(newLang);
};

const initializeLang = () => setLang(getLang());
initializeLang();

const blockPageMove = (): void => {
    const bloqued = document.body.style.overflow === 'hidden';
    document.body.style.overflow = bloqued ? 'unset' : 'hidden';
};

// data

const filesToLoad = await fileFetcher().then((data) =>
    data?.split('\n').filter((e) => e),
);

// menu
let userPosition = window.scrollY;
window.addEventListener('scroll', () => {
    const menu = document.querySelector<HTMLMenuElement>('.menu')!;
    if (window.scrollY < 61) return;

    window.requestAnimationFrame(() => {
        if (window.scrollY < userPosition) {
            menu.classList.remove('hide');
        } else {
            menu.classList.add('hide');
        }

        userPosition = window.scrollY;
    });
});

menuLang.addEventListener('pointerdown', toggleLang);
menuBtn.addEventListener('pointerdown', () => {
    menuLinks.classList.toggle('visible');
    menuBtn.classList.toggle('view');
    blockPageMove();
});
menuLinks.querySelectorAll('a').forEach((btn) => {
    btn.addEventListener('pointerdown', () => {
        menuLinks.classList.remove('visible');
        menuBtn.classList.toggle('view');
    });
});

import '../css/style.css';
import txtSR from './ui-sr_txt';

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

// menu
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

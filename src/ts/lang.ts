import txtSR from './ui-sr_txt';
import { Lang } from './types';

const getLang = (): Lang => {
    let lang = localStorage.getItem('lang') || navigator.language.slice(0, 2);
    return lang === 'es' ? 'es' : 'en';
};

const setLangButtonContent = (lang: Lang): void => {
    const menuLang = document.querySelector<HTMLButtonElement>('.menu__lang');
    if (!menuLang) {
        throw new Error('Can not find the lang button');
    }

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

const toggleLang = (callback: Function): void => {
    const currentLang = getLang();
    const newLang: Lang = currentLang === 'es' ? 'en' : 'es';
    setLang(newLang);
    callback();
};

const initializeLang = () => setLang(getLang());

export { getLang, initializeLang, toggleLang };

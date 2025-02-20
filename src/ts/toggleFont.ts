import { getLang } from './lang';
import { Lang } from './types';
import uiSr_txt from './ui-sr_txt';

const getFont = () => {
    let fontLocal = localStorage.getItem('font_d');
    if (fontLocal === null) {
        fontLocal = 'false';
        localStorage.setItem('font_d', fontLocal);
    }
    return fontLocal === 'true';
};

const setFont = (font: boolean) => {
    localStorage.setItem('font_d', `${font}`);
    setFontButton(font, getLang());
};

const toggleFont = () => {
    setFont(!getFont());
};

const setFontButton = (font: boolean, lang: Lang) => {
    const btn = document.querySelector<HTMLButtonElement>('.menu__dyslexic')!;
    btn.textContent = '';
    const srData = document.createElement('span');
    const isDyslexic = font ? 'dyslexic' : 'nonDyslexic';
    srData.classList.add('sr-only');
    srData.textContent = uiSr_txt[lang][isDyslexic].dyslexicBtnSr;
    const txtBtn = document.createElement('span');
    txtBtn.ariaHidden = 'true';
    txtBtn.textContent = uiSr_txt[lang][isDyslexic].dyslexicBtn;

    btn.append(srData, txtBtn);
    btn.addEventListener('click', toggleFont);

    document.documentElement.classList.toggle('dyslexic', font);
};

export { getFont, setFont };

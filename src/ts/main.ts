import '../css/style.css';
import { getLang, initializeLang, toggleLang } from './lang';
import { dataLoader } from './loader';
import { Renderer } from './render';

const menuLang = document.querySelector<HTMLButtonElement>('.menu__lang')!;
const menuBtn = document.querySelector<HTMLButtonElement>('.menu__show')!;
const menuLinks = document.querySelector<HTMLUListElement>('.menu__links')!;

// lang
initializeLang();

// UI
const blockPageMove = (): void => {
    const bloqued = document.body.style.overflow === 'hidden';
    document.body.style.overflow = bloqued ? 'unset' : 'hidden';
};

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

// data

const initialData = await dataLoader(getLang());
const renderDom = new Renderer();
renderDom.renderMarkdown(initialData).html;

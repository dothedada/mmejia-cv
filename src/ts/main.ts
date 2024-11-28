import '../css/style.css';
import { getLang, initializeLang, setLang } from './lang';
import { dataLoader } from './loader';
import { Parser } from './parser';
import { Renderer } from './render';
import { Lang } from './types';

const loadPage = async () => {
    try {
        const lang = getLang();
        const data = await dataLoader(lang);
        const parser = new Parser();
        const parsed = await parser.parseDocument(data);
        const render = new Renderer();
        const { html, menu: menuItems } = render.renderMarkdown(parsed);

        const main = document.querySelector<HTMLElement>('main')!;
        const menu = document.querySelector<HTMLUListElement>('.menu__links')!;
        main.innerHTML = html;
        menu.innerHTML = menuItems;

        const moreBtn = document.querySelectorAll('.card__btn');
        const closeBtn = document.querySelectorAll('dialog .dialog__closeBtn');

        moreBtn.forEach((btn) => {
            const id = btn.getAttribute('data-target')!;
            const modal = document.getElementById(id)!;
            (btn as HTMLButtonElement).addEventListener('pointerdown', () => {
                (modal as HTMLDialogElement).showModal();
                blockPageMove();
            });
        });

        closeBtn.forEach((btn) => {
            const modal = btn.parentNode;
            (btn as HTMLButtonElement).addEventListener('pointerdown', () => {
                (modal as HTMLDialogElement).close();
                blockPageMove();
            });
        });
    } catch {
        throw new Error('Could not load the page');
    }
};

// page setup
initializeLang();
loadPage();

const menuLang = document.querySelector<HTMLButtonElement>('.menu__lang')!;
const menuBtn = document.querySelector<HTMLButtonElement>('.menu__show')!;
const menuLinks = document.querySelector<HTMLUListElement>('.menu__links')!;

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

const toggleLang = (): void => {
    const currentLang = getLang();
    const newLang: Lang = currentLang === 'es' ? 'en' : 'es';
    setLang(newLang);
    loadPage();
};
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

// const initialData = await dataLoader(getLang());
// const renderDom = new Renderer();
// const parsedData = await renderDom.renderMarkdown(initialData);
// const main = document.querySelector('main')!;
// main.innerHTML = parsedData.html;

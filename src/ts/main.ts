import '../css/style.css';
import { getLang, initializeLang, toggleLang } from './lang';
import { dataLoader } from './loader';
import { Parser } from './parser';
import { Renderer } from './render';
import uiSr_txt from './ui-sr_txt';

const main = document.querySelector<HTMLElement>('main')!;
const menu = document.querySelector<HTMLUListElement>('.menu__links')!;
const showMenuBtn = document.querySelector<HTMLButtonElement>('.menu__show')!;

const loadPage = async () => {
    try {
        // carga de información
        const lang = getLang();
        const data = await dataLoader(lang);
        const parser = new Parser();
        const parsed = await parser.parseDocument(data);
        const render = new Renderer();
        const { html, menu: menuItems } = render.renderMarkdown(parsed);

        if (!html || !menuItems) {
            throw new Error('Can not load the data');
        }

        main.innerHTML = html;
        menu.innerHTML = menuItems;

        // visibilidad del menu
        const moreBtn = document.querySelectorAll('.card__btn');
        const closeBtn = document.querySelectorAll('dialog .dialog__closeBtn');
        const anchors = menu.querySelectorAll<HTMLAnchorElement>('a');

        if (!moreBtn || !closeBtn || !anchors) {
            throw new Error('Can not render the UI');
        }

        moreBtn.forEach((btn) => {
            btn.addEventListener('pointerdown', openModal);
        });
        closeBtn.forEach((btn) => {
            btn.addEventListener('pointerdown', closeModal);
        });
        anchors.forEach((anchor) => {
            anchor.addEventListener('click', showMenu);
        });
    } catch {
        throw new Error('Could not load the page');
    }
};
initializeLang();
loadPage();

const langBtn = document.querySelector<HTMLButtonElement>('.menu__lang')!;
langBtn.addEventListener('pointerdown', () => toggleLang(loadPage));

const openModal = (e: Event): void => {
    const target = e.currentTarget as HTMLButtonElement;
    const id = target.getAttribute('data-target')!;
    const modal = document.getElementById(id)! as HTMLDialogElement;
    modal.showModal();
    blockWheel(true);
};

const closeModal = (e: Event): void => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLButtonElement;
    (target.parentNode as HTMLDialogElement).close();
    blockWheel(false);
};

const showMenu = (): void => {
    const showMenuBtnStyles = getComputedStyle(showMenuBtn);
    if (showMenuBtnStyles.getPropertyValue('display') !== 'block') {
        return;
    }
    menu.classList.toggle('visible');
    showMenuBtn.ariaLabel = menu.classList.contains('visible')
        ? uiSr_txt[getLang()].menu.BtnClose
        : uiSr_txt[getLang()].menu.BtnOpen;
    blockWheel(menu.classList.contains('visible'));
};

showMenuBtn.addEventListener('pointerdown', showMenu);
showMenuBtn.ariaLabel = uiSr_txt[getLang()].menu.BtnOpen;

const blockWheel = (freeze: boolean): void => {
    document.body.style.overflow = freeze ? 'hidden' : 'unset';
};

// menu
let userPosition = window.scrollY;
window.addEventListener('scroll', () => {
    const navBar = document.querySelector<HTMLMenuElement>('.menu')!;

    if (window.scrollY < 61) {
        return;
    }

    window.requestAnimationFrame(() => {
        navBar.classList.toggle('hide', window.scrollY > userPosition);
        userPosition = window.scrollY;
    });
});

const refreshMenu = () => {
    const availableSpace = document.documentElement.clientWidth;
    if (availableSpace > 650) {
        menu.classList.remove('visible');
        const modal = document.querySelector<HTMLDialogElement>('dialog[open]');
        modal?.close();
        blockWheel(false);
    }
};

const debounce = (callback: Function, miliseconds: number) => {
    let timer: number;
    return () => {
        clearTimeout(timer);
        timer = setTimeout(callback, miliseconds);
    };
};
window.addEventListener('resize', debounce(refreshMenu, 500));

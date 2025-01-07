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
            throw new Error('Unable to load the data');
        }

        main.innerHTML = html;
        menu.innerHTML = menuItems;
        main.className = 'first_plane';
        const moreBtn =
            document.querySelectorAll<HTMLButtonElement>('.card__btn');
        const closeBtn = document.querySelectorAll<HTMLButtonElement>(
            'dialog .dialog__closeBtn',
        );
        const anchors = menu.querySelectorAll<HTMLAnchorElement>('a');
        const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog');
        hideMenuAria(document.documentElement.clientWidth < 650);

        if (!moreBtn || !closeBtn || !anchors) {
            throw new Error('Unable to render de UI');
        }

        moreBtn.forEach((btn) => {
            btn.addEventListener('pointerdown', openDialog);
            btn.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    openDialog(e);
                }
            });
        });
        closeBtn.forEach((btn) => {
            btn.addEventListener('pointerdown', closeDialog);
            btn.addEventListener('keydown', (e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                    closeDialog(e);
                }
            });
        });
        anchors.forEach((anchor) => {
            anchor.addEventListener('click', showMenu);
        });
        dialogs.forEach((dialog) => {
            dialog.addEventListener('pointerdown', clickOutsideDialog);
        });
    } catch (err) {
        console.log(err);
        throw new Error('Could not load the page');
    }
};
initializeLang();
loadPage();

document.body.addEventListener('keydown', (e) => {
    if (e.key === 'a') {
        main.classList.toggle('minify');
    }
    if (e.key !== 'Escape') {
        return;
    }
    blockMain(false);
});

const langBtn = document.querySelector<HTMLButtonElement>('.menu__lang')!;
langBtn.addEventListener('pointerdown', () => toggleLang(loadPage));

const openDialog = (e: Event): void => {
    const navBar = document.querySelector<HTMLMenuElement>('.menu')!;
    navBar.classList.add('hide');
    const target = e.currentTarget as HTMLButtonElement;
    const id = target.getAttribute('data-target')!;
    const modal = document.getElementById(id)! as HTMLDialogElement;
    modal.showModal();
    blockMain(true);
};

const closeDialog = (e: Event): void => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLButtonElement;
    const modal = target.parentNode as HTMLDialogElement;

    modal.setAttribute('closing', '');
    modal.addEventListener(
        'animationend',
        () => {
            modal.removeAttribute('closing');
            modal.close();
        },
        { once: true },
    );
    blockMain(false);
};

const clickOutsideDialog = (e: MouseEvent): void => {
    const dialog = e.target as HTMLDialogElement;
    const dialogBoundaries = dialog.getBoundingClientRect();
    if (
        e.clientY < dialogBoundaries.top ||
        e.clientY > dialogBoundaries.bottom ||
        e.clientX < dialogBoundaries.left ||
        e.clientX > dialogBoundaries.right
    ) {
        dialog.close();
        blockMain(false);
    }
};

const showMenu = (): void => {
    const showMenuBtnStyles = getComputedStyle(showMenuBtn);
    if (showMenuBtnStyles.getPropertyValue('display') !== 'block') {
        return;
    }
    menu.classList.toggle('visible');
    const visible = menu.classList.contains('visible');
    hideMenuAria(!visible);
    showMenuBtn.ariaLabel = visible
        ? uiSr_txt[getLang()].menu.BtnClose
        : uiSr_txt[getLang()].menu.BtnOpen;
    showMenuBtn.ariaExpanded = `${visible}`;
    blockMain(visible);
};

const hideMenuAria = (hide: boolean): void => {
    menu.ariaHidden = `${hide}`;
    if (hide) {
        menu.removeAttribute('aria-live');
    } else {
        menu.setAttribute('aria-live', 'polite');
    }
    const links = menu.querySelectorAll<HTMLAnchorElement>('a');
    links.forEach((link) => {
        link.tabIndex = hide ? -1 : 0;
    });
};

showMenuBtn.addEventListener('pointerdown', showMenu);
showMenuBtn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
        showMenu();
    }
});
showMenuBtn.ariaLabel = uiSr_txt[getLang()].menu.BtnOpen;
showMenuBtn.ariaExpanded = 'false';

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
    const modal = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (availableSpace > 650) {
        menu.classList.remove('visible');
        hideMenuAria(false);
    } else {
        hideMenuAria(true);
    }
    modal?.close();
    blockMain(false);
};

const debounce = (callback: Function, miliseconds: number) => {
    let timer: number;
    return () => {
        clearTimeout(timer);
        timer = setTimeout(callback, miliseconds);
    };
};

const blockMain = (freeze: boolean): void => {
    document.body.style.overflow = freeze ? 'hidden' : 'unset';
    main.classList.toggle('first_plane', !freeze);
    main.classList.toggle('second_plane', freeze);
};

window.addEventListener('resize', debounce(refreshMenu, 500));

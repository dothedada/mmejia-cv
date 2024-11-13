import '../css/style.css';

// menu
const menuLang = document.querySelector<HTMLButtonElement>('.menu__lang');
const menuLinks = document.querySelector<HTMLUListElement>('.menu__links');
const menuBtn = document.querySelector<HTMLButtonElement>('.menu__show');

console.log(window.getComputedStyle(menuBtn).getPropertyValue('display'));

menuBtn?.addEventListener('pointerdown', () => {
    menuLinks?.classList.toggle('visible');
    menuBtn.classList.toggle('view');
});

menuLinks?.querySelectorAll('a').forEach((btn) => {
    btn.addEventListener('pointerdown', () => {
        menuLinks.classList.remove('visible');
        menuBtn?.classList.toggle('view');
    });
});

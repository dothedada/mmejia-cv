const getFont = (): boolean => {
    let dislexyaFont: string | null = localStorage.getItem('font');
    if (dislexyaFont === null) {
        localStorage.setItem('font', 'false');
    }

    return !!dislexyaFont;
};

const toggleFont = () => {
    const isDislexyaFont = !getFont();
    localStorage.setItem('font', `${isDislexyaFont}`);

    return isDislexyaFont;
};

export { getFont, toggleFont };

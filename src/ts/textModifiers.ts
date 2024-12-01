const htmlScapeChars: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '`': '&#x60;',
    '=': '&#x3D;',
    // '/': '&#x2F;',
};
const keySanitizer = (rawKey: string): string => {
    const keyToSanitize = rawKey.trim();

    if (!keyToSanitize) {
        new Error(`there is no text to sanitize: ${rawKey}`);
    }

    return keyToSanitize
        .replace(/ (\w)/g, (match) => match.toUpperCase().slice(1))
        .replace(/-+/g, '-')
        .replace(/^-+|-+|[^\w]$/g, '');
};

const textSanitizer = (rawTxt: string): string => {
    const textToSanitize = rawTxt.trim();

    if (!textToSanitize) {
        new Error(`there is no text to sanitize: ${rawTxt}`);
    }

    const specialCharsRegex = new RegExp(
        `[${Object.keys(htmlScapeChars).join('')}]`,
        'g',
    );

    return textToSanitize.replace(
        specialCharsRegex,
        (match) => htmlScapeChars[match],
    );
};

const replaceLinkInString = (
    _: string,
    text: string,
    href: string,
    type?: string,
): string => {
    let attr = '';
    if (type === 'B') {
        attr = ' target="_blank"';
    } else if (type === 'D') {
        const filenameRegex = /\/((?!.+\/).+\.[\w\d]{3})/;
        const filename = href.match(filenameRegex)?.[1] || 'myDownload.pdf';
        attr = ` download="${filename}" type="application/pdf"`;
    }
    return `<a href="${href.trim()}"${attr}>${text.trim() || href.trim()}</a>`;
};

const textFormatter = (text: string): string => {
    const strongRegex = /\*\*([\w\s]+)\*\*/g;
    const emphasisRegex = /\*(.+)\*/g;
    const linkInParRegex = /\[(.*?)\]\((.+?)\)([BD])?/g;

    const simpleWrapper = (label: string) => (text: string) =>
        `<${label}>${text}</${label}>`;
    const replaceStrong = simpleWrapper('strong');
    const replaceEmphasis = simpleWrapper('em');

    return text
        .replace(strongRegex, replaceStrong)
        .replace(emphasisRegex, replaceEmphasis)
        .replace(linkInParRegex, replaceLinkInString);
};

export { keySanitizer, textSanitizer, textFormatter };

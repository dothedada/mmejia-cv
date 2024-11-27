import { ParserState } from './stateManager';
import { Parser, ParsedToken, HeaderParser } from './types';

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
        .replace(/ (\w)/g, (match) => match.toUpperCase())
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
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

const fmBoundariesParser: HeaderParser = (sectionData, state) => {
    const frontMatterRegex = /^---$/;
    if (!frontMatterRegex.test(sectionData)) {
        return;
    }

    if (state.inHeader === null) {
        state.setHeader(true);
    } else if (state.inHeader === true) {
        state.setHeader(false);
    }
};

const fmKeyValueParser: HeaderParser = (sectionData, state) => {
    if (!state.inHeader) {
        return;
    }
    const fmKeyValueRegex = /^( +)?(.+):(?: +)(.+)$/;
    const fmKeyValueMatch = sectionData.match(fmKeyValueRegex);

    if (!fmKeyValueMatch) {
        return;
    }

    const [, indent, key, value] = fmKeyValueMatch;
    const indentCount = Math.floor(indent?.length / 4) || 0;

    return {
        type: 'keyValue',
        indent: indentCount,
        key: keySanitizer(key),
        value: textSanitizer(value),
    };
};

const fmDataContainerParser: HeaderParser = (sectionData, state) => {
    if (!state.inHeader) {
        return;
    }

    const fmDataContainerRegex = /^( +)?(.+):(?: +)?$/;
    const fmDataContainerMatch = sectionData.match(fmDataContainerRegex);

    if (!fmDataContainerMatch) {
        return;
    }

    const [, indent, key] = fmDataContainerMatch;
    const indentCount = Math.floor(indent?.length / 4) || 0;

    return {
        type: 'key',
        indent: indentCount,
        key: keySanitizer(key),
    };
};

const fmDataItemParser: HeaderParser = (sectionData, state) => {
    if (!state.inHeader) {
        return;
    }

    const fmDataItemRegex = /^( +)?- *(.+)$/;
    const fmDataItemMatch = sectionData.match(fmDataItemRegex);

    if (!fmDataItemMatch) {
        return;
    }

    const [, indent, value] = fmDataItemMatch;
    const indentCount = Math.floor(indent?.length / 4) || 0;

    return {
        type: 'value',
        indent: indentCount,
        value: textSanitizer(value),
    };
};

const sectionParser: Parser = (sectionData) => {
    const sectionRegex = /---\((.*)\)/;
    const section = sectionData.match(sectionRegex);

    if (!section) {
        return;
    }

    return {
        label: 'section',
        name: keySanitizer(section[1]),
    };
};

const headingsParser: Parser = (sectionData) => {
    const headingRegex = /^(#{1,6})\s*(.+)$/;
    const headingArray = sectionData.match(headingRegex);
    if (!headingArray) {
        return;
    }

    const [, hashes, heading] = headingArray;

    if (hashes.length < 1 || hashes.length > 6) {
        throw new Error(`Invalid Headin level: ${hashes.length}`);
    }

    return {
        label: 'h',
        level: hashes.length,
        content: textFormatter(textSanitizer(heading)),
        id: keySanitizer(heading),
    };
};

const decoratorParser: Parser = (sectionData) => {
    const decoratorRegex = /^\/\/\s(.+)$/;
    const decoratorArray = sectionData.match(decoratorRegex);
    if (!decoratorArray) {
        return;
    }

    return {
        label: 'div',
        class: 'decorator',
        content: textSanitizer(decoratorArray[1]),
    };
};

const linkParser: Parser = (sectionData) => {
    const linkRegex = /^\[(.+)\]\((.+)\)([DB])?/;
    const filenameRegex = /\/((?!.+\/).+\.[\w\d]{3})/;
    const linkArray = sectionData.match(linkRegex);
    if (!linkArray) {
        return;
    }

    const [, linkTxt, link, linkType] = linkArray;
    if (!link.trim()) {
        throw new Error(`Invalid link in: "${sectionData}"`);
    }

    const linkProps: ParsedToken = {
        label: 'a',
        href: link.trim(),
        content:
            textFormatter(textSanitizer(linkTxt)) ||
            textFormatter(textSanitizer(link)),
    };
    if (linkType === 'D') {
        const filename = link.match(filenameRegex)?.[1] || 'myDownload.pdf';
        linkProps.download = filename;
        linkProps.type = 'application/pdf';
    } else if (linkType === 'B') {
        linkProps.target = '_blank';
    }

    return linkProps;
};

const imgParser: Parser = (sectionData) => {
    const imgRegex = /!\[(.+)\]\((.+)\)/;
    const imgArray = sectionData.match(imgRegex);
    if (!imgArray) {
        return;
    }

    const [, imgAlt, imgSrc] = imgArray;
    if (!imgAlt.trim() || !imgSrc.trim()) {
        throw new Error(`Invalid image or alternate text in: "${sectionData}"`);
    }

    return {
        label: 'img',
        alt: textSanitizer(imgAlt),
        src: imgSrc.replace(/"/g, '&quot;'),
    };
};

const hrParser: Parser = (sectionData) => {
    const dividerRegex = /^---$/;
    if (!sectionData.match(dividerRegex)) {
        return;
    }

    return { label: 'hr' };
};

const listParser: Parser = (sectionData) => {
    const listRegex = /^( +)?[-] +(.+)$/;
    const listItem = sectionData.match(listRegex);

    if (!listItem) {
        return;
    }

    const [, indent, item] = listItem;
    const indentCount = Math.floor(indent?.length / 4) || 0;

    return {
        label: 'li',
        content: textFormatter(textSanitizer(item)),
        indent: indentCount,
    };
};

const paragraphParser: Parser = (sectionData) => {
    const text = sectionData.trim();

    if (!text) {
        return;
    }

    return {
        label: 'p',
        content: textFormatter(textSanitizer(text)),
    };
};

const dataPointParser: Parser = (sectionData) => {
    const injectionPointRegex = /^@@ *(.+)$/;
    const injectionPointMatch = sectionData.match(injectionPointRegex);

    if (!injectionPointMatch) {
        return;
    }

    return {
        label: 'dataPoint',
        content: injectionPointMatch[1],
    };
};

export {
    fmBoundariesParser,
    fmKeyValueParser,
    fmDataContainerParser,
    fmDataItemParser,
    sectionParser,
    headingsParser,
    hrParser,
    listParser,
    linkParser,
    imgParser,
    decoratorParser,
    paragraphParser,
    dataPointParser,
};

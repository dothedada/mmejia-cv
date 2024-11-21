interface Section {
    name: string;
    data: string;
}
type Header = Record<string, string | string[]>;
type SectionData = Map<string, string>;
type ListState = (number | null)[];
type LinkElement = Record<'download' | 'type' | 'target' | 'href', string>;

interface ParserState {
    isSubSectionOpen: boolean;
    listState: ListState;
}

const parserState: ParserState = {
    isSubSectionOpen: false,
    listState: [null],
};

const createElement = (
    tag: string,
    content: string,
    attributes?: Record<string, string>,
): string => {
    if (!attributes) {
        return `<${tag}>${content}</${tag}>`;
    }

    const attrs = Object.entries(attributes)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

    return `<${tag} ${attrs}>${content}</${tag}>`;
};

const parseDocument = (loadedData: string): [Header, string] => {
    const headerRegex = /---([\s\S]*?)---\n([\s\S]*)/;
    const dataSplit = loadedData.match(headerRegex);
    if (!dataSplit || dataSplit.length !== 3) {
        throw new Error('Invalid frontmatter format');
    }

    const [, headerString, bodyString] = dataSplit;
    const currentLevel: string[] = [];
    const header: Header = {};

    const headerLines = headerString.split('\n').map((line) => {
        const regexIndent = /^\s+/;
        return {
            string: line.trim(),
            indent: line.match(regexIndent)?.[0].length || 0,
        };
    });

    for (const { string: line, indent } of headerLines) {
        if (!line) {
            continue;
        }

        if (line.includes(': ')) {
            const [key, ...value] = line.split(': ');
            header[key] = value.join(': ').trim();
            continue;
        }

        if (line.endsWith(':')) {
            const hasParent = indent > 0;
            const level = hasParent ? line.slice(2, -1) : line.slice(0, -1);
            currentLevel.length = hasParent ? 1 : 0;
            currentLevel.push(level);
            continue;
        }

        const text = line.match(/^-\s*(.+)$/);

        if (!text) {
            throw new Error(`Invalid line format: ${text}`);
        }

        const cleanText = text[1];

        header[currentLevel[0]] = header[currentLevel[0]] ?? [];
        const targetArr = header[currentLevel[0]];

        if (!Array.isArray(targetArr)) {
            throw new Error(`Expected an Array but found ${typeof targetArr}`);
        }

        targetArr.push(cleanText);
    }

    return [header, bodyString];
};

const parseSections = (bodyString: string): SectionData => {
    const sectionRegex = /---\((.+)\)\n+([\S\s]+?)---\(\1\)/g;

    const sections = new Map();
    Array.from(bodyString.matchAll(sectionRegex)).forEach((section) => {
        const [, sectionName, sectionData] = section;
        sections.set(sectionName, sectionData);
    });

    return sections;
};

// let parserState.isSubSectionOpen = false;
const parseHeadings = (sectionData: string): string | void => {
    const headingRegex = /^(#{1,6})\s*(.+)$/;
    const headingArray = sectionData.match(headingRegex);
    if (!headingArray) {
        return;
    }
    if (headingArray.length < 3) {
        throw new Error(`Could not parse the heading string ${sectionData}`);
    }
    const [, hashes, heading] = headingArray;
    const hLevel = hashes.length;
    const headingId = heading
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');

    let baseHeading = `<h${hLevel} id="${headingId}">${heading.trim()}</h${hLevel}>`;

    if (parserState.isSubSectionOpen && hLevel > 3) {
        baseHeading = `\t</div>\n\n${baseHeading}`;
        parserState.isSubSectionOpen = false;
        return baseHeading;
    }

    if (hLevel === 3) {
        if (parserState.isSubSectionOpen) {
            return `\t</div>\n\n\t<div class="subSection">\n\n${baseHeading}`;
        }
        parserState.isSubSectionOpen = true;
        return `\t<div class="subSection">\n\n${baseHeading}`;
    }

    return baseHeading;
};

const parseDecorator = (sectionData: string): string | void => {
    const decoratorRegex = /^\/\/\s(.+)$/;
    const decoratorArray = sectionData.match(decoratorRegex);
    if (!decoratorArray) {
        return;
    }
    if (decoratorArray.length < 2) {
        console.log(decoratorArray);
        throw new Error(`Could not parse the decorator string ${sectionData}`);
    }
    const decorator = decoratorArray[1];
    return createElement('div', decorator, { class: 'decorator' });
};

const parseLink = (sectionData: string): string | void => {
    const linkRegex = /^\[(.+)\]\((.+)\)([DB])?/;
    const linkArray = sectionData.match(linkRegex);
    if (!linkArray) {
        return;
    }
    if (linkArray.length < 4) {
        throw new Error(`Could not parse the link string ${sectionData}`);
    }

    const [, linkTxt, link, linkType] = linkArray;
    if (!linkTxt.trim() || !link.trim()) {
        throw new Error(`Invalid link or text in: "${sectionData}"`);
    }

    const linkSettings: Partial<LinkElement> = {};
    linkSettings.href = link;
    if (linkType === 'D') {
        const filenameRegex = /\/((?!.+\/).+\.[\w\d]{3})/;
        const filename = link.match(filenameRegex)?.[1] || '';
        linkSettings.download = filename;
        linkSettings.type = 'application/pdf';
    } else if (linkType === 'B') {
        linkSettings.target = '_blank';
    }

    return createElement('a', linkTxt, linkSettings);
};

const parseImg = (sectionData: string): string | void => {
    const imgRegex = /!\[(.+)\]\((.+)\)/;
    const imgArray = sectionData.match(imgRegex);
    if (!imgArray) {
        return;
    }
    if (imgArray.length < 3) {
        throw new Error(`Could not parse the link string ${sectionData}`);
    }

    const [, imgAlt, imgSrc] = imgArray;

    const safeAlt = imgAlt.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const safeSrc = imgSrc.trim().replace(/"/g, '&quot;');

    if (!safeAlt || !safeSrc) {
        throw new Error(`Invalid image or alternate text in: "${sectionData}"`);
    }

    return `<img src="${imgSrc}" alt="${imgAlt}" />`;
};

const parseDivider = (sectionData: string): string | void => {
    const dividerRegex = /^---$/;
    if (!sectionData.match(dividerRegex)) {
        return;
    }
    if (parserState.isSubSectionOpen) {
        parserState.isSubSectionOpen = false;
        return '\t</div>\n\n<hr>';
    }
    return '<hr>';
};

const parseList = (
    sectionData: string,
    listState: ListState,
): string | void => {
    const listRegex = /^( +)?[-] +(.+)$/;
    const listItem = sectionData.match(listRegex);

    if (!listItem) {
        if (listState[0] !== null) {
            listState[0] = null;
            return '</ul>';
        }
        return;
    }

    let listRender = '';
    const [, indent, item] = listItem;
    const indentCount = indent?.length || 0;

    if (listState[0] === null || listState[0] < indentCount) {
        listRender += '<ul>\n';
    } else if (listState[0] > indentCount) {
        listRender += '\n</ul>';
    }
    listState[0] = indentCount;

    listRender += createElement('li', item.trim());

    return listRender;
};

const parseParagraph = (sectionData: string): string | void => {
    const strongRegex = /\*\*([\w\s]+)\*\*/g;
    const emphasisRegex = /\*(.+)\*/g;
    const linkInParRegex = /\[.+\]\(.+\)[BD]?/g;
    const text = sectionData.trim();

    if (!text) {
        return;
    }

    const sanitizedText = text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt')
        .replace(strongRegex, '<strong>$1</strong>')
        .replace(emphasisRegex, '<em>$1</em>')
        .replace(linkInParRegex, (match) => parseLink(match) || '');

    if (!parserState.isSubSectionOpen) {
        parserState.isSubSectionOpen = true;
        return `\t<div class="subSection">\n\n${createElement('p', sanitizedText)}`;
    }

    return createElement('p', sanitizedText);
};

const parsers = [
    parseHeadings,
    parseDecorator,
    parseLink,
    parseImg,
    parseDivider,
    (line: string) => parseList(line, parserState.listState),
    parseParagraph,
];

const processLine = (line: string): string => {
    for (const parser of parsers) {
        const parsedLine = parser(line);
        if (parsedLine) {
            return parsedLine;
        }
    }

    return line;
};

const makeMenu = (sections: SectionData): string => {
    let menu = '<ul class="menu__links">\n';
    for (const section of sections.keys()) {
        menu += `<li><a href="#${section}">${section}</a></li>\n`;
    }
    menu += '</ul>';

    return menu;
};

const makeSection = (sections: SectionData, htmlSection: string): string => {
    let mainDocument = `<${htmlSection}>\n`;
    for (const [name, section] of sections.entries()) {
        let sectionParsed = section.split('\n').map(processLine).join('\n');
        if (parserState.isSubSectionOpen) {
            sectionParsed += '\n\n\t</div>';
            parserState.isSubSectionOpen = false;
        }
        mainDocument += `<section id="${name}">\n${sectionParsed}</section>\n`;
        console.log(sectionParsed);
    }
    mainDocument += `</${htmlSection}>`;

    return mainDocument;
};

const makeDocument = (loadedData: string): Section[] | void => {
    const [header, bodyString] = parseDocument(loadedData);
    const sectionsData = parseSections(bodyString);
    const menu = makeMenu(sectionsData);
    const mainDocument = makeSection(sectionsData, 'main');

    // console.log(header, menu, mainDocument);
};

export { makeDocument };

interface Page {
    menu: string;
    document: string;
    header: Header;
}
type Header = Record<string, string | string[]>;
type SectionData = Map<string, string>;
type ListState = (number | null)[];
type LinkProps = Record<'download' | 'type' | 'target' | 'href', string>;
type ImgProps = Record<'src' | 'alt', string>;
type HeadingProps = Record<'id', string>;
type SectionProps = Record<'id' | 'class', string>;
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
    attributes: Record<string, string> = {},
    selfClosing = false,
): string => {
    const attrs = Object.entries(attributes)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ');

    return selfClosing
        ? `<${tag} ${attrs}/> `
        : `<${tag} ${attrs}>${content}</${tag}>`;
};

const closeSubSection = (): string => {
    if (parserState.isSubSectionOpen) {
        parserState.isSubSectionOpen = false;
        return '</div>\n';
    }
    return '';
};

const openSubsection = (): string => {
    let prefix = '';
    if (parserState.isSubSectionOpen) {
        prefix += closeSubSection();
    }
    parserState.isSubSectionOpen = true;
    return `${prefix}<div class="sub lala">\n`;
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
    const headingProps: Partial<HeadingProps> = {};
    headingProps.id = heading
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');

    let baseHeading = createElement(`h${hLevel}`, heading.trim(), headingProps);

    if (parserState.isSubSectionOpen && hLevel > 3) {
        baseHeading = `${closeSubSection()}${baseHeading}`;
        return baseHeading;
    }

    if (hLevel === 3) {
        return `${openSubsection()}${baseHeading}`;
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

    const linkProps: Partial<LinkProps> = {};
    linkProps.href = link;
    if (linkType === 'D') {
        const filenameRegex = /\/((?!.+\/).+\.[\w\d]{3})/;
        const filename = link.match(filenameRegex)?.[1] || '';
        linkProps.download = filename;
        linkProps.type = 'application/pdf';
    } else if (linkType === 'B') {
        linkProps.target = '_blank';
    }

    return createElement('a', linkTxt, linkProps);
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

    const imgProps: Partial<ImgProps> = {};

    imgProps.alt = imgAlt.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
    imgProps.src = imgSrc.trim().replace(/"/g, '&quot;');

    if (!imgProps.alt || !imgProps.src) {
        throw new Error(`Invalid image or alternate text in: "${sectionData}"`);
    }

    return createElement('img', '', imgProps, true);
};

const parseDivider = (sectionData: string): string | void => {
    const dividerRegex = /^---$/;
    if (!sectionData.match(dividerRegex)) {
        return;
    }

    return `${closeSubSection()}${createElement('hr', '', {}, true)}`;
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

    let prefix = '';
    if (!parserState.isSubSectionOpen) {
        prefix += openSubsection();
    }

    return `${prefix}${createElement('p', sanitizedText)}`;
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

const makeSection = (sections: SectionData): string => {
    let mainDocument = '';

    for (const [name, section] of sections.entries()) {
        let sectionParsed = section.split('\n').map(processLine).join('\n');
        sectionParsed += closeSubSection();
        const sectionProps: Partial<SectionProps> = {};
        sectionProps.id = name;
        mainDocument += createElement('section', sectionParsed, sectionProps);
    }

    return mainDocument;
};

const makeDocument = (loadedData: string): Page => {
    const [header, bodyString] = parseDocument(loadedData);
    const sectionsData = parseSections(bodyString);
    const menu = makeMenu(sectionsData);
    const mainDocument = createElement('main', makeSection(sectionsData));

    console.log(header);

    return {
        menu,
        document: mainDocument,
        header,
    };
};

export { makeDocument };

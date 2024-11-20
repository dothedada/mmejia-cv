interface Section {
    name: string;
    data: string;
}
interface DataWithLink {
    text: string;
    link: string;
}
type ParsedData = string | DataWithLink | ParsedData[];
type Header = Record<string, ParsedData | Record<string, ParsedData>>;
type SectionData = Map<string, string>;
type ListState = (number | null)[];

const allocateHeaderData = (
    header: Header,
    parentNode: string,
    childNode: string,
) => {
    if (childNode) {
        header[parentNode] = header[parentNode] ?? {};
        const parentObject = header[parentNode] as Record<string, ParsedData[]>;
        parentObject[childNode] = parentObject[childNode] ?? [];
    } else {
        header[parentNode] = header[parentNode] ?? [];
    }

    const targetArr = childNode
        ? (header[parentNode] as Record<string, ParsedData[]>)[childNode]
        : header[parentNode];

    if (!Array.isArray(targetArr)) {
        throw new Error(`Expected an Array but found ${typeof targetArr}`);
    }
    return targetArr;
};

const parseHeader = (loadedData: string): [Header, string] => {
    const headerRegex = new RegExp(/---([\s\S]*?)---\n([\s\S]*)/);
    const dataSplit = loadedData.match(headerRegex);
    if (!dataSplit || dataSplit.length !== 3) {
        throw new Error('Invalid frontmatter format');
    }

    const [, headerString, bodyString] = dataSplit;
    const currentLevel: string[] = [];
    const header: Header = {};

    const headerLines = headerString.split('\n').map((line) => {
        const regexIndent = new RegExp(/^\s+/);
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

        const [rawData, link] = line.split(' | ');
        const text = rawData.match(/^-\s*(.+)$/);

        if (!text) {
            throw new Error(`Invalid line format: ${text}`);
        }

        const cleanData: ParsedData = !link
            ? text[1]
            : { text: text[1], link: link.trim() };

        const [parentNode, childNode] = currentLevel;
        const targetArr = allocateHeaderData(header, parentNode, childNode);

        targetArr.push(cleanData);
    }

    return [header, bodyString];
};

const makeSections = (bodyString: string): SectionData => {
    const sectionRegex = new RegExp(/---\((.+)\)\n+([\S\s]+?)---\(\1\)/, 'g');

    const sections = new Map();
    Array.from(bodyString.matchAll(sectionRegex)).forEach((section) => {
        const [, sectionName, sectionData] = section;
        sections.set(sectionName, sectionData);
    });

    return sections;
};

const parseHeadings = (sectionData: string): string | void => {
    const headingRegex = new RegExp(/^(#{1,6})\s*(.+)$/);
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
    return `<h${hLevel} id="${headingId}">${heading.trim()}</h${hLevel}>`;
};

const parseDecorator = (sectionData: string): string | void => {
    const decoratorRegex = new RegExp(/^\/\/\s(.+)$/);
    const decoratorArray = sectionData.match(decoratorRegex);
    if (!decoratorArray) {
        return;
    }
    if (decoratorArray.length < 2) {
        console.log(decoratorArray);
        throw new Error(`Could not parse the decorator string ${sectionData}`);
    }
    const decorator = decoratorArray[1];
    return `<div class="decorator">${decorator}</div>`;
};

const parseLink = (sectionData: string): string | void => {
    const linkRegex = new RegExp(/^\[(.+)\]\((.+)\)([DB])?/);
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

    let linkSettings = '';
    if (linkType === 'D') {
        const filenameRegex = new RegExp(/\/((?!.+\/).+\.[\w\d]{3})/);
        const filename = link.match(filenameRegex)?.[1];
        linkSettings = ` download="${filename}" type="application/pdf"`;
    } else if (linkType === 'B') {
        linkSettings = ' target="_blank"';
    }

    return `<a href="${link}"${linkSettings}>${linkTxt}</a> `;
};

const parseImg = (sectionData: string): string | void => {
    const imgRegex = new RegExp(/!\[(.+)\]\((.+)\)/);
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
    const dividerRegex = new RegExp(/^---$/);
    if (!sectionData.match(dividerRegex)) {
        return;
    }
    return '<hr>';
};

const parseList = (
    sectionData: string,
    listState: ListState,
): string | void => {
    const listRegex = new RegExp(/^( +)?[-] +(.+)$/);
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

    listRender += `<li>${item.trim()}</li>`;

    return listRender;
};

const parseParagraph = (sectionData: string): string | void => {
    const strongRegex = new RegExp(/\*\*([\w\s]+)\*\*/, 'g');
    const emphasisRegex = new RegExp(/\*(.+)\*/, 'g');
    const linkInParRegex = new RegExp(/\[.+\]\(.+\)[BD]?/, 'g');
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

    return `<p>${sanitizedText}</p>`;
};

let listState: ListState = [null];
const parsers = [
    parseHeadings,
    parseDecorator,
    parseLink,
    parseImg,
    parseDivider,
    (line: string) => parseList(line, listState),
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
    let mainDocument = '<main>\n';
    for (const [name, section] of sections.entries()) {
        const sectionParsed = section.split('\n').map(processLine).join('\n');
        mainDocument += `<section id="${name}">\n${sectionParsed}</section>\n`;
    }
    mainDocument += '</main>';

    return mainDocument;
};

const makeDocument = (loadedData: string): Section[] => {
    const [header, bodyString] = parseHeader(loadedData);
    const sectionsData = makeSections(bodyString);
    const menu = makeMenu(sectionsData);
    const mainDocument = makeSection(sectionsData);

    console.log(header, menu, mainDocument);
};

export { makeDocument };

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

type SectionData = Record<string, string>;

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

const makeSections = (bodyString: string): SectionData[] => {
    const sectionRegex = new RegExp(/---\((.+)\)\n+([\S\s]+?)---\(\1\)/, 'g');

    const sections = Array.from(bodyString.matchAll(sectionRegex)).map(
        (section) => {
            const [, sectionName, sectionData] = section;
            return { [sectionName]: sectionData };
        },
    );

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
    if (decoratorArray.length < 3) {
        throw new Error(`Could not parse the decorator string ${sectionData}`);
    }
    const decorator = decoratorArray[1];
    return `<div class="decorator">${decorator}</div>`;
};

const parseLink = (sectionData: string): string | void => {
    const linkRegex = new RegExp(/\[(.+)\]\((.+)\)([DB])?/);
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
    const linkSettings =
        linkType === 'D'
            ? ` download="${linkTxt}" type="application/pdf"`
            : linkType === 'B'
              ? ' target="_blank"'
              : '';
    return `<a href="${link}"${linkSettings}>${linkTxt}</a>`;
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

const parseParagraph = (sectionData: string): string | void => {
    const text = sectionData.trim();
    const strongRegex = new RegExp(/\*\*([\w\s]+)\*\*/, 'g');
    const emphasisRegex = new RegExp(/\*(.+)\*/, 'g');

    if (!text) {
        return;
    }

    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt')
        .replace(strongRegex, '<strong>$1</strong>')
        .replace(emphasisRegex, '<em>$1</em>');
};

type ListState = { items: string[]; indent: number };

const parseLi = (listState: ListState, sectionData: string): void => {
    const isInList = !!listState.items.length;
    const liRegex = new RegExp(/^( +)?[-*]\s+(.+)$/);

    const listItem = sectionData.match(liRegex);

    if (!listItem && !isInList) {
        return;
    }

    if (!listItem) {
        listState.items.push('</ul>');
        return;
    }

    if (listItem.length < 3) {
        throw new Error(`Could not parse the list item string ${sectionData}`);
    }

    const [, indentString, item] = listItem;
    const currentIndent = indentString?.length ?? 0;

    if (!isInList || listState.indent < currentIndent) {
        listState.items.push('<ul>');
    }
    if (listState.indent > currentIndent) {
        listState.items.push('</ul>');
    }

    listState.items.push(`<li>${item.trim()}</li>`);
    listState.indent = currentIndent;
};

const parseUl = (sectionData: string) => {
    // const ulRegex = new RegExp(
    //     /(?: *)(?:[-]\s+.+)(?:\n(?!\s*(?:#|\[|\/|\n|\w)).+)*/,
    //     'g',
    // );

    // const list = sectionData.match(ulRegex)?.[0] ?? '';
    // const list = sectionData;
    //
    // if (!list) {
    //     return;
    // }
    // console.log(list);
    //
    // const listItems = list.split('\n');
    // listItems.push('');
    // const listState: ListState = { items: [], indent: 0 };
    // listItems.forEach((listItem) => parseLi(listState, listItem));
    //
    // return listState.items.join('\n');

    const listItems = sectionData.split('\n');
    listItems.push(''); // Asegura el cierre de la última lista.
    const listState: ListState = { items: [], indent: 0 };
    listItems.forEach((listItem) => parseLi(listState, listItem));

    return listState.items.join('\n');
};

const parseSections = (loadedData: string): Section[] => {
    const [header, bodyString] = parseHeader(loadedData);
    const sectionsData = makeSections(bodyString);

    // const menuElements = '123';
    const listState: ListState = { items: [], indent: 0 };

    let text = `
lkasjlaksd
asd
asd
asd*

asdasdad

- Item 1
  - Subitem 1.1
    - Subitem 1.1.1
  - Subitem 1.2
- Item 2
- Item 3
- Item 4
- Item 5

# Heading 1

- Another list
- Nested item

[Link](http://example.com)
`;

    text = text.replace(
        /(?: *)(?:[-*]\s+.+)(?:\n(?:\s*(?:[-*]\s+.+))+)*/g,
        (match) => parseUl(match) || match, // Reemplaza con la lista parseada.
    );

    console.log(text);
    // console.log(listState.items);
};

export { parseSections };

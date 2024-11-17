type DataWithLink = {
    text: string;
    link: string;
};
type ParsedData = string | DataWithLink;

type Header = Record<string, ParsedData | Record<string, ParsedData[]>>;

const setTarget = (header: Header, parentNode: string, childNode: string) => {
    if (childNode) {
        header[parentNode] = header[parentNode] ?? {};
        const parentObject = header[parentNode] as Record<string, ParsedData[]>;
        parentObject[childNode] = parentObject[childNode] ?? [];
    } else {
        header[parentNode] = header[parentNode] ?? [];
    }
};

const getTarget = (header: Header, parentNode: string, childNode: string) => {
    setTarget(header, parentNode, childNode);

    const targetArr = childNode
        ? (header[parentNode] as Record<string, ParsedData[]>)[childNode]
        : header[parentNode];

    if (!Array.isArray(targetArr)) {
        throw new Error(`Expected an Array but found ${typeof targetArr}`);
    }
    return targetArr;
};

const headerParser = (headerData: string): Header => {
    const header: Header = {};
    const headerLines = headerData.split('\n').map((line) => ({
        content: line.trim(),
        indent: line.match(/^\s*/)?.[0].length || 0,
    }));
    const currentLevel: string[] = [];

    for (const { content: line, indent } of headerLines) {
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
        const targetArr = getTarget(header, parentNode, childNode);

        targetArr.push(cleanData);
    }
    return header;
};

const bodyParser = (bodyData: string, header: Header) => {
    const { portfolio, contact } = header;

    const regex = new RegExp(/---\((.+)\)\n+([\S\s]+?)---\(\1\)/, 'g');
    const bodySections = Array.from(bodyData.matchAll(regex)).map((section) => {
        console.log(section, portfolio, contact);
        const [, sectionName, sectionContent] = section;
        return { section: sectionName, content: sectionContent };
    });
};

const fileParser = (fileData: string) => {
    const match = fileData.match(/---([\s\S]*?)---\n([\s\S]*)/);

    if (!match || match.length < 3) {
        throw new Error(
            'Invalid frontmatter format: Missing or malformed delimiter',
        );
    }

    const [, headerData, bodyData] = match;

    const header = headerParser(headerData);
    const body = bodyParser(bodyData, header);
    console.log(header);

    return { header, body };
};

export default fileParser;

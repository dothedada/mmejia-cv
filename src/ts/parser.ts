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
            console.log(sectionName);
            return { [sectionName]: sectionData };
        },
    );

    return sections;
};

const parseSections = (loadedData: string): Section[] => {
    const [header, bodyString] = parseHeader(loadedData);
    const sectionsData = makeSections(bodyString);

    console.log(header, sectionsData);
};

export { parseSections };

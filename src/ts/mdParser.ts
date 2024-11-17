interface HeadProperty {
    [key: string]: string;
}

interface ParsedFile {
    header: HeadProperty;
    body?: string;
}

const fileParser = (fileData: string): ParsedFile => {
    const match = fileData.match(/---([\s\S]*?)---\n([\s\S]*)/);

    if (!match || match.length < 3) {
        throw new Error(
            'Invalid frontmatter format: Missing or malformed delimiter',
        );
    }

    const [, headerData, body] = match;
    const header: HeadProperty = {};
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

        let targerArray: string[];
        if (currentLevel.length === 1) {
            header[currentLevel[0]] = header[currentLevel[0]] ?? [];
            targerArray = header[currentLevel[0]];
        } else {
            header[currentLevel[0]] = header[currentLevel[0]] ?? {};
            header[currentLevel[0]][currentLevel[1]] =
                header[currentLevel[0]][currentLevel[1]] ?? [];
            targerArray = header[currentLevel[0]][currentLevel[1]];
        }

        targerArray.push(line);
    }
    console.log(headerData, header);
    return { header, body };
};

export default fileParser;
// for (const line of headerData.split('\n')) {
//     const trimmedLine = line.trim();
//     if (!trimmedLine) {
//         continue;
//     }
//
//     const splitLine = trimmedLine.split(': ');
//     if (splitLine.length > 1) {
//         const [key, value] = splitLine;
//         header[key] = value;
//         continue;
//     }
//
//     if (trimmedLine[0] !== '-') {
//         currentLevel.length = 0;
//         // const level = trimmedLine.slice(0, -1);
//         // header[level] = [];
//         currentLevel.push(trimmedLine.slice(0, -1));
//         continue;
//     }
//
//     if (/^-\s(.+):$/.test(trimmedLine)) {
//         currentLevel.length = 1;
//         if (!header[currentLevel[0]]) {
//             header[currentLevel[0]] = {};
//         }
//         const subLevel = trimmedLine.match(/^-\s(.+):$/)![1];
//         header[currentLevel[0]][subLevel] = [];
//         currentLevel.push(subLevel);
//         continue;
//     }
//
//     if (/-\s(?!.*:$)(.+)/.test(trimmedLine)) {
//         if (!header[currentLevel[0]]) {
//             header[currentLevel[0]] = [];
//         }
//         const insertionPoint = /\s{5,}/.test(line)
//             ? header[currentLevel[0]][currentLevel[1]]
//             : header[currentLevel[0]];
//         const cleanLine = trimmedLine.slice(2);
//         if (/ | /.test(cleanLine)) {
//             const [text, link] = cleanLine.split(' | ');
//             insertionPoint.push({ text, link });
//         } else {
//             insertionPoint.push(cleanLine);
//         }
//     }
// }

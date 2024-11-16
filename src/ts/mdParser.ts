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
        throw new Error('The file format is incorrect');
    }

    const [, headerData, body] = match;
    const header: HeadProperty = {};

    if (headerData) {
        for (const headerInfo of headerData.split('\n')) {
            const [key, value] = headerInfo.split(':');

            if (!key || !value) {
                continue;
            }

            header[key.trim()] =
                value.trim().match(/['"]([\S ]*)["']|^(.*)$/)?.[1] || '';
        }
    }
    return { header, body };
};

export default fileParser;

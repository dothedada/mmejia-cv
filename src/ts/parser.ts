import { getLang } from './lang';
import { dataLoader } from './loader';
import { ParserState } from './stateManager';
import { keySanitizer, textSanitizer, textFormatter } from './textModifiers';
import {
    Parsers,
    ParsedToken,
    HeaderParser,
    Header,
    HeaderToken,
    ParsedDocument,
} from './types';

export class Parser {
    private state: ParserState;
    private header: Header;
    private headerParsers: HeaderParser[];
    private bodyParsers: Parsers[];

    constructor() {
        this.state = new ParserState();
        this.header = {};

        this.headerParsers = [
            this.fmBoundariesParser,
            this.fmKeyValueParser,
            this.fmDataContainerParser,
            this.fmDataItemParser,
        ];

        this.bodyParsers = [
            this.sectionParser,
            this.headingsParser,
            this.hrParser,
            this.listParser,
            this.linkParser,
            this.imgParser,
            this.decoratorParser,
            this.dataPointParser,
            this.paragraphParser,
        ];
    }

    async parseDocument(markdown: string): Promise<ParsedDocument> {
        const bodyRaw = this.documentSetup(markdown);
        const body = this.parseBody(bodyRaw);
        const header = Object.keys(this.header).length ? this.header : null;

        const parsedDocument: ParsedDocument = {
            header,
            body,
        };

        if (!header) {
            return parsedDocument;
        }

        for (const key of Object.keys(this.header)) {
            if (!this.state.findDataInjector(key)) {
                continue;
            }
            parsedDocument.sideFiles = parsedDocument.sideFiles ?? {};

            const files = header[key] as string[];
            const lang = getLang();
            const loadItems = await Promise.all(
                files.map(async (file: string) => {
                    const data = await dataLoader(lang, key, file as string);
                    const parser = new Parser();
                    return parser.parseDocument(data);
                }),
            );

            parsedDocument.sideFiles[key] = loadItems;
        }

        return parsedDocument;
    }

    private documentSetup(markdown: string): string[] {
        const allLines = markdown.split('\n');
        if (!allLines.length) {
            throw new Error('The file is empty.');
        }

        const tokenParent: string[] = [];
        const [firstLine, ...lines] = allLines;

        this.fmBoundariesParser(firstLine);
        if (!this.state.inHeader) {
            return allLines;
        }

        let currentLine = 0;
        while (this.state.inHeader && currentLine < lines.length) {
            for (const headerParser of this.headerParsers) {
                const headerToken = headerParser(lines[currentLine]);
                if (headerToken) {
                    this.makeHeader(headerToken, tokenParent);
                    break;
                }
            }
            currentLine++;
        }

        return lines.slice(currentLine);
    }

    private makeHeader(headerToken: HeaderToken, parent: string[]): void {
        if (headerToken.indent <= parent.length) {
            parent.length = headerToken.indent;
        }

        if (headerToken.type === 'key') {
            parent.push(headerToken.key);
            return;
        }

        const parentRoute = parent.length
            ? parent.slice(0, -1).reduce((current, key) => {
                  if (!current[key]) {
                      current[key] = {};
                  }
                  return current[key] as Header;
              }, this.header)
            : this.header;

        const keyName = parent[parent.length - 1];

        if (headerToken.type === 'keyValue') {
            parentRoute[headerToken.key] = headerToken.value;
        } else {
            if (!parentRoute[keyName]) {
                parentRoute[keyName] = [];
            }
            (parentRoute[keyName] as string[]).push(headerToken.value);
        }
    }

    private parseBody(lines: string[]): ParsedToken[] {
        if (!lines.length) {
            throw new Error('The document has no body to parse');
        }
        const parsedTokens: ParsedToken[] = [];
        let currentLine = 0;
        while (currentLine < lines.length) {
            for (const bodyParser of this.bodyParsers) {
                const bodyToken = bodyParser(lines[currentLine]);

                if (bodyToken) {
                    parsedTokens.push(bodyToken);
                    break;
                }
            }
            currentLine++;
        }

        return parsedTokens;
    }

    private fmBoundariesParser: HeaderParser = (sectionData) => {
        const frontMatterRegex = /^---$/;
        if (!frontMatterRegex.test(sectionData)) {
            return;
        }

        if (this.state.inHeader === null) {
            this.state.setHeader(true);
        } else if (this.state.inHeader === true) {
            this.state.setHeader(false);
        }
    };

    private fmKeyValueParser: HeaderParser = (sectionData) => {
        if (!this.state.inHeader) {
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

    private fmDataContainerParser: HeaderParser = (sectionData) => {
        if (!this.state.inHeader) {
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

    private fmDataItemParser: HeaderParser = (sectionData) => {
        if (!this.state.inHeader) {
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

    private sectionParser: Parsers = (sectionData) => {
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

    private headingsParser: Parsers = (sectionData) => {
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

    private decoratorParser: Parsers = (sectionData) => {
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

    private linkParser: Parsers = (sectionData) => {
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

    private imgParser: Parsers = (sectionData) => {
        const imgRegex = /^!\[(.*)\]\((.+)\)(?:\{(.+)\})?$/;
        const imgArray = sectionData.match(imgRegex);
        if (!imgArray) {
            return;
        }

        const [, imgAlt, imgSrc, figCaption] = imgArray;
        if (!imgAlt.trim() || !imgSrc.trim()) {
            throw new Error(
                `Invalid image or alternate text in: "${sectionData}"`,
            );
        }

        return {
            label: 'img',
            alt: textSanitizer(imgAlt),
            src: imgSrc.replace(/"/g, '&quot;'),
            figCaption: figCaption ? textSanitizer(figCaption) : undefined,
        };
    };

    private hrParser: Parsers = (sectionData) => {
        const dividerRegex = /^---$/;
        if (!sectionData.match(dividerRegex)) {
            return;
        }

        return { label: 'hr' };
    };

    private listParser: Parsers = (sectionData) => {
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

    private paragraphParser: Parsers = (sectionData) => {
        const text = sectionData.trim();

        if (!text) {
            return;
        }

        return {
            label: 'p',
            content: textFormatter(textSanitizer(text)),
        };
    };

    private dataPointParser: Parsers = (sectionData) => {
        const injectionPointRegex = /^@@ *(.+)$/;
        const injectionPointMatch = sectionData.match(injectionPointRegex);

        if (!injectionPointMatch) {
            return;
        }

        this.state.setDataInjector(injectionPointMatch[1]);

        return {
            label: 'dataPoint',
            content: injectionPointMatch[1],
        };
    };
}

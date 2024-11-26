import { dataLoader } from './loader';
import {
    ParserState,
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
} from './parser';

import {
    Parser,
    Page,
    Header,
    ParsedToken,
    Render,
    SectionToken,
    HeadingToken,
    LinkToken,
    ImgToken,
    DivToken,
    ParagraphToken,
    ListToken,
    HeaderParser,
    HeaderToken,
    DataPointToken,
} from './types';

export class Renderer {
    private state: ParserState;
    private header: Header;
    private headerParsers: HeaderParser[];
    private parsers: Parser[];

    constructor() {
        this.state = new ParserState();
        this.header = {};

        this.headerParsers = [
            fmBoundariesParser,
            fmKeyValueParser,
            fmDataContainerParser,
            fmDataItemParser,
        ];

        this.parsers = [
            sectionParser,
            headingsParser,
            hrParser,
            listParser,
            linkParser,
            imgParser,
            decoratorParser,
            dataPointParser,
            paragraphParser,
        ];
    }

    renderMarkdown(markdown: string): Page {
        const lines = this.getDocumentStructure(markdown);
        const menuItems = this.state.showSections.join(' ');

        let html = '';

        // NOTE:
        // 1. hacer el parseo de las dependencias antes para inyectarlas en
        //      el parseo del documento global
        // 2. hacer el render del menu

        for (const line of lines) {
            for (const parser of this.parsers) {
                const token = parser(line);

                if (token) {
                    html += this.renderToken(token);
                    break;
                }
            }
        }

        html += this.state.inSubsection ? this.closeSubsection() : '';
        html += this.state.inSection ? this.closeSection() : '';

        return { html, menu: menuItems, header: this.header };
    }

    private getDocumentStructure(markdown: string): string[] {
        console.log(markdown);
        const allLines = markdown.split('\n');
        if (!allLines.length) {
            throw new Error('Empty file');
        }

        const parent: string[] = [];
        const [firstLine, ...lines] = allLines;

        this.headerParsers[0](firstLine, this.state);
        if (!this.state.inHeader) {
            return allLines;
        }

        let currentLine = 0;
        while (this.state.inHeader || currentLine === lines.length) {
            for (const parser of this.headerParsers) {
                const headerToken = parser(lines[currentLine], this.state);
                if (headerToken) {
                    this.insertHeaderToken(headerToken, parent);
                    break;
                }
            }
            currentLine++;
        }

        const markdownToRender = lines.slice(currentLine);
        if (!markdownToRender.length) {
            throw new Error('There is no markdown to parse');
        }

        return markdownToRender;
    }

    private insertHeaderToken(token: HeaderToken, parent: string[]): void {
        if (token.indent <= parent.length) {
            parent.length = token.indent;
        }

        if (token.type === 'key') {
            parent.push(token.key);
            return;
        }

        const insertionPoint = parent.length
            ? parent.reduce((current, key) => {
                  if (!current[key]) {
                      current[key] = {};
                  }
                  return current[key] as Header;
              }, this.header)
            : this.header;

        const keyName = parent[parent.length - 1];

        if (token.type === 'keyValue') {
            insertionPoint[token.key] = token.value;
        } else {
            if (!Array.isArray(insertionPoint[keyName])) {
                insertionPoint[keyName] = [];
            }
            (insertionPoint[keyName] as string[]).push(token.value);
        }
    }

    private renderToken(token: ParsedToken): string {
        const renderers: Record<string, Render> = {
            section: (t) => this.sectionRenderer(t as SectionToken),
            h: (t) => this.headingRenderer(t as HeadingToken),
            a: (t) => this.linkRenderer(t as LinkToken),
            hr: () => this.ruleRenderer(),
            img: (t) => this.imgRenderer(t as ImgToken),
            div: (t) => this.divRenderer(t as DivToken),
            p: (t) => this.paragraphRenderer(t as ParagraphToken),
            li: (t) => this.listRenderer(t as ListToken),
            dataPoint: (t) => this.dataPointRenderer(t as DataPointToken),
        };

        return renderers[token.label](token) || '\n';
    }

    private closeList(): string {
        if (this.state.currentListLevel === null) {
            return ``;
        }
        let prefix = '';
        while (this.state.currentListLevel > 0) {
            prefix += '</ul>\n</li>\n';
            this.state.setListLevel(this.state.currentListLevel - 1);
        }
        this.state.setListLevel(null);
        return `${prefix}</ul>\n`;
    }

    private closeSubsection(): string {
        this.state.setSubsection(false);
        const prefix = this.closeList();
        return `${prefix}\t</div>\n`;
    }

    private closeSection(): string {
        this.state.setInSection(false);
        const prefix = this.state.inSubsection ? this.closeSubsection() : '';
        return `${prefix}</section>\n\n`;
    }

    private openSubsection(): string {
        let prefix = '';
        if (this.state.inSubsection) {
            prefix += this.closeSubsection();
        }
        this.state.setSubsection(true);
        return `${prefix}\n\n\t<div class="sub lala">\n`;
    }

    private sectionRenderer(token: SectionToken): string {
        let prefix = '';
        if (token.name === '') {
            return this.closeSection();
        }
        if (this.state.inSection) {
            prefix = this.closeSection();
        }
        if (this.state.currentSection === token.name) {
            return prefix;
        }
        this.state.setSection(token.name);
        return `${prefix}<section id="${token.name}">\n`;
    }

    private headingRenderer(token: HeadingToken): string {
        let prefix = ``;
        if (this.state.inSubsection && token.level < 3) {
            prefix = this.closeSubsection();
        } else if (token.level === 3) {
            prefix = this.openSubsection();
        } else {
            prefix = this.closeList();
        }
        return `${prefix}<h${token.level} id="${token.id}">${token.content}</h${token.level}>\n`;
    }

    private linkRenderer(token: LinkToken): string {
        let attr = '';

        if (token.target) {
            attr = ` target="_blank"`;
        } else if (token.type) {
            attr = ` download="${token.download}" type="application/pdf"`;
        }
        return `<a href="${token.href}"${attr}>${token.content}</a>\n`;
    }

    private ruleRenderer(): string {
        let prefix = '';
        prefix += `${this.state.inSubsection} `;
        if (this.state.inSubsection) {
            prefix = this.closeSubsection();
        }
        return `${prefix}<hr>\n`;
    }

    private imgRenderer(token: ImgToken): string {
        const prefix = this.closeList();
        return `${prefix}<img alt="${token.alt}" src="${token.src}">\n`;
    }

    private divRenderer(token: DivToken): string {
        let attr = '';
        if (token.id) {
            attr += ` id="${token.id}"`;
        }
        if (token.class) {
            attr += ` class="${token.class}"`;
        }
        return `<${token.label}${attr}>${token.content}</${token.label}>\n`;
    }

    private paragraphRenderer(token: ParagraphToken): string {
        let prefix = '';
        prefix += this.closeList();
        if (!this.state.inSubsection) {
            prefix = this.openSubsection();
        }
        return `${prefix}<p>${token.content}</p>\n`;
    }

    private listRenderer(token: ListToken): string {
        let prefix = '';
        if (this.state.currentListLevel === null) {
            prefix = '<ul>\n';
        } else if (token.indent > this.state.currentListLevel) {
            prefix = '<li>\n<ul>\n';
        } else if (token.indent < this.state.currentListLevel) {
            prefix = '\n</ul>\n</li>\n';
        }
        this.state.setListLevel(token.indent);

        return `${prefix}<li>${token.content}</li>\n`;
    }

    private async dataPointRenderer(token: DataPointToken): Promise<string> {
        if (!(token.content in this.header)) {
            throw new Error(
                `there is key ${token.content} to inkject in frontmatter`,
            );
        }
        const cards = Object.values(this.header[token.content]);

        const loadedCards = await Promise.all(
            cards.map((card) => {
                return dataLoader('es', token.content, card as string);
            }),
        );

        const renderCards = loadedCards.map((card) => {
            const renderer = new Renderer();
            return renderer.renderMarkdown(card).header.stack.stack;
        });

        console.log(renderCards);

        return `\n\n<div id="${token.content}">${cards.join(' ')}</div>\n\n\n`;
    }
}
